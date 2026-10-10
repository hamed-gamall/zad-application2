package com.zadalmuslim.app.media;

import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Bridges the web player (AudioPlayerProvider.tsx) to a real Android
 * MediaSession + foreground service, giving radio/reciter/tawashih playback:
 *  - actual lock-screen / notification-shade transport controls, and
 *  - immunity from Android's background execution limits, which is what was
 *    causing long streams to randomly cut out once the screen locked or the
 *    app left the foreground.
 *
 * JS calls `update` on every play/pause/track-change; native hardware/
 * notification button presses are relayed back to JS as `mediaCommand`
 * events that AudioPlayerProvider listens for and applies to the real
 * &lt;audio&gt; element (which remains the actual source of playback).
 */
@CapacitorPlugin(name = "MediaSession")
public class MediaSessionPlugin extends Plugin {
    private static MediaSessionPlugin activeInstance;
    private static final int MAX_ARTWORK_PX = 300;

    @Override
    public void load() {
        super.load();
        activeInstance = this;
    }

    @PluginMethod
    public void update(PluginCall call) {
        final String title = call.getString("title", "زَادُ المُسْلِم");
        final String artist = call.getString("artist", "");
        final String artworkUrl = call.getString("artworkUrl", null);
        final boolean playing = Boolean.TRUE.equals(call.getBoolean("playing", false));
        final long posMs = (long) (call.getDouble("positionSeconds", 0.0) * 1000);
        final long durMs = (long) (call.getDouble("durationSeconds", 0.0) * 1000);

        Context ctx = getContext();

        // Artwork is optional and fetched off the main thread; the transport
        // controls themselves must not wait on it, so send a first update
        // immediately and a second one if/when artwork resolves.
        sendUpdate(ctx, title, artist, playing, posMs, durMs, null);

        if (artworkUrl != null) {
            new Thread(() -> {
                Bitmap art = downloadBitmap(artworkUrl);
                if (art != null) {
                    sendUpdate(ctx, title, artist, playing, posMs, durMs, art);
                }
            }).start();
        }

        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Context ctx = getContext();
        Intent intent = new Intent(ctx, MediaPlaybackService.class);
        intent.setAction(MediaPlaybackService.ACTION_STOP);
        try {
            ctx.startService(intent);
        } catch (Exception e) {
            // Service may already be gone — nothing to stop.
        }
        call.resolve();
    }

    /**
     * Starts playback of a live stream using native ExoPlayer instead of the
     * shared web &lt;audio&gt; element — see {@link MediaPlaybackService} for
     * why this exists (currently: only "إذاعة القرآن الكريم من القاهرة").
     * Reuses the exact same MediaSessionCompat/notification as every other
     * track; JS is notified of playback state via the "nativeRadioState"
     * event instead of &lt;audio&gt; DOM events.
     */
    @PluginMethod
    public void playNativeRadio(PluginCall call) {
        final String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("url is required");
            return;
        }
        final String title = call.getString("title", "زَادُ المُسْلِم");
        final String artist = call.getString("artist", "بث مباشر");
        final String artworkUrl = call.getString("artworkUrl", null);
        final Context ctx = getContext();

        Intent intent = new Intent(ctx, MediaPlaybackService.class);
        intent.setAction(MediaPlaybackService.ACTION_PLAY_NATIVE);
        intent.putExtra("url", url);
        intent.putExtra("title", title);
        intent.putExtra("artist", artist);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(intent);
        } else {
            ctx.startService(intent);
        }

        // Same "resolve immediately, apply artwork whenever it arrives"
        // pattern as update() above — transport controls must not wait on
        // an image download.
        if (artworkUrl != null) {
            new Thread(() -> {
                Bitmap art = downloadBitmap(artworkUrl);
                if (art == null) return;
                Intent artIntent = new Intent(ctx, MediaPlaybackService.class);
                artIntent.setAction(MediaPlaybackService.ACTION_UPDATE_NATIVE_ARTWORK);
                artIntent.putExtra("artworkBitmap", art);
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        ctx.startForegroundService(artIntent);
                    } else {
                        ctx.startService(artIntent);
                    }
                } catch (Exception e) {
                    // Playback may have already moved on — fine to drop.
                }
            }).start();
        }

        call.resolve();
    }

    @PluginMethod
    public void pauseNativeRadio(PluginCall call) {
        sendSimpleServiceAction(MediaPlaybackService.ACTION_PAUSE_NATIVE);
        call.resolve();
    }

    @PluginMethod
    public void resumeNativeRadio(PluginCall call) {
        sendSimpleServiceAction(MediaPlaybackService.ACTION_RESUME_NATIVE);
        call.resolve();
    }

    private void sendSimpleServiceAction(String action) {
        Context ctx = getContext();
        Intent intent = new Intent(ctx, MediaPlaybackService.class);
        intent.setAction(action);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(intent);
            } else {
                ctx.startService(intent);
            }
        } catch (Exception e) {
            // Service may already be gone.
        }
    }

    private void sendUpdate(
        Context ctx,
        String title,
        String artist,
        boolean playing,
        long posMs,
        long durMs,
        Bitmap artwork
    ) {
        Intent intent = new Intent(ctx, MediaPlaybackService.class);
        intent.setAction(MediaPlaybackService.ACTION_UPDATE_STATE);
        intent.putExtra("title", title);
        intent.putExtra("artist", artist);
        intent.putExtra("playing", playing);
        intent.putExtra("positionMs", posMs);
        intent.putExtra("durationMs", durMs);
        if (artwork != null) intent.putExtra("artworkBitmap", artwork);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(intent);
        } else {
            ctx.startService(intent);
        }
    }

    private Bitmap downloadBitmap(String urlStr) {
        try {
            URL url = new URL(urlStr);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(4000);
            conn.setReadTimeout(4000);
            conn.connect();
            Bitmap full = android.graphics.BitmapFactory.decodeStream(conn.getInputStream());
            if (full == null) return null;
            // Keep this well under the Binder transaction limit (~1MB) since
            // it travels to the service via an Intent extra.
            int w = full.getWidth();
            int h = full.getHeight();
            if (w <= MAX_ARTWORK_PX && h <= MAX_ARTWORK_PX) return full;
            float scale = Math.min((float) MAX_ARTWORK_PX / w, (float) MAX_ARTWORK_PX / h);
            return Bitmap.createScaledBitmap(full, Math.round(w * scale), Math.round(h * scale), true);
        } catch (Exception e) {
            return null;
        }
    }

    /** Called from MediaPlaybackService when a hardware/notification button is pressed. */
    static void notifyCommand(String command) {
        if (activeInstance == null) return;
        JSObject data = new JSObject();
        data.put("command", command);
        activeInstance.notifyListeners("mediaCommand", data);
    }

    static void notifySeek(long positionMs) {
        if (activeInstance == null) return;
        JSObject data = new JSObject();
        data.put("command", "seek");
        data.put("positionSeconds", positionMs / 1000.0);
        activeInstance.notifyListeners("mediaCommand", data);
    }

    /** Called from MediaPlaybackService whenever native ExoPlayer's state changes. */
    static void notifyNativeRadioState(String state) {
        if (activeInstance == null) return;
        JSObject data = new JSObject();
        data.put("state", state);
        activeInstance.notifyListeners("nativeRadioState", data);
    }
}
