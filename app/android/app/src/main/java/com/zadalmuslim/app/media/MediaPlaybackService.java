package com.zadalmuslim.app.media;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;
import androidx.media.session.MediaButtonReceiver;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import com.zadalmuslim.app.MainActivity;

/**
 * A real Android foreground Service that mirrors the web page's audio state
 * into a proper {@link MediaSessionCompat}. This is what a plain WebView
 * &lt;audio&gt; element cannot do on its own:
 *
 * <ul>
 *   <li>Shows real lock-screen / notification-shade playback controls.</li>
 *   <li>Keeps the process alive (foreground priority) so a live radio stream
 *       or long recitation doesn't get throttled/killed by Android's
 *       background execution limits a minute or two after the screen locks
 *       or the app is backgrounded.</li>
 * </ul>
 *
 * For almost every track, the JS side (AudioPlayerProvider) remains the
 * single source of truth for *what* is playing — this service only reflects
 * that state into the OS and relays hardware/notification button presses
 * back to JS via {@link MediaSessionPlugin} ("web-mirror mode", driven by
 * {@link #ACTION_UPDATE_STATE}).
 *
 * One station — "إذاعة القرآن الكريم من القاهرة" (RadioJar-hosted) — is the
 * sole exception: its edge server sometimes 30x-redirects an https:// stream
 * request to a *different* host over plain http:// (confirmed via Logcat:
 * "Mixed Content ... requested an insecure audio file 'http://n0f.radiojar
 * .com/...'"). A WebView &lt;audio&gt; element refuses to follow that
 * downgrade for the same reason a desktop browser tab would if the stream
 * were embedded in one — it's a mixed-content violation, not a broken
 * stream — so it fails in the app while working when the URL is opened
 * directly. Media3/ExoPlayer's HTTP data source has the same default
 * refusal, but — unlike a WebView's mixed-content policy — it can be told
 * to trust a specific source and follow that redirect
 * ({@code setAllowCrossProtocolRedirects(true)}, see
 * {@link #startNativeExoPlayer}), which is exactly what "native mode" here
 * is for. It reuses this exact same {@link MediaSessionCompat}, foreground
 * notification, and JS bridge — there is still only ever one active
 * player and one media session, never a competing second one.
 */
@UnstableApi
public class MediaPlaybackService extends Service {
    public static final String CHANNEL_ID = "media_playback";
    private static final int NOTIFICATION_ID = 5551;

    private MediaSessionCompat mediaSession;
    private PlaybackStateCompat.Builder stateBuilder;
    private Bitmap lastArtwork;
    /** title+artist key that `lastArtwork` actually belongs to — see updateState(). */
    private String lastArtworkTrackKey;
    /** Lazily-decoded app-branding image, shown whenever a track has no artwork of its own yet. */
    private Bitmap defaultArtwork;

    // ---- Native playback (Cairo Quran radio only — see class doc) ----
    private static final int MAX_NATIVE_RETRIES = 5;
    private ExoPlayer nativePlayer;
    private boolean isNativeMode = false;
    private int nativeRetryCount = 0;
    private String lastNativeUrl;
    private String nativeTitle;
    private String nativeArtist;
    private final Handler nativeRetryHandler = new Handler(Looper.getMainLooper());
    private Runnable nativeRetryRunnable;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannelIfNeeded();

        mediaSession = new MediaSessionCompat(this, "ZadAlmuslimMediaSession");
        mediaSession.setFlags(
            MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS
                | MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
        );

        // Without this, the system can't tie the session back to this app's
        // launcher identity in the Android 13+ output/volume media card, so
        // it falls back to showing only the generic output-device label
        // ("This phone") instead of the app's icon and name above it. This
        // is also what makes tapping the "Now Playing" card open the app.
        Intent sessionActivityIntent = new Intent(this, MainActivity.class);
        PendingIntent sessionActivityPendingIntent = PendingIntent.getActivity(
            this,
            0,
            sessionActivityIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        mediaSession.setSessionActivity(sessionActivityPendingIntent);

        stateBuilder = new PlaybackStateCompat.Builder().setActions(
            PlaybackStateCompat.ACTION_PLAY
                | PlaybackStateCompat.ACTION_PAUSE
                | PlaybackStateCompat.ACTION_PLAY_PAUSE
                | PlaybackStateCompat.ACTION_SKIP_TO_NEXT
                | PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
                | PlaybackStateCompat.ACTION_SEEK_TO
        );
        mediaSession.setPlaybackState(stateBuilder.build());

        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override
            public void onPlay() {
                if (isNativeMode) {
                    resumeNative();
                } else {
                    MediaSessionPlugin.notifyCommand("play");
                }
            }

            @Override
            public void onPause() {
                if (isNativeMode) {
                    pauseNative();
                } else {
                    MediaSessionPlugin.notifyCommand("pause");
                }
            }

            @Override
            public void onSkipToNext() {
                MediaSessionPlugin.notifyCommand("next");
            }

            @Override
            public void onSkipToPrevious() {
                MediaSessionPlugin.notifyCommand("previous");
            }

            @Override
            public void onSeekTo(long pos) {
                MediaSessionPlugin.notifySeek(pos);
            }

            @Override
            public void onStop() {
                if (isNativeMode) {
                    stopSession();
                } else {
                    MediaSessionPlugin.notifyCommand("stop");
                }
            }
        });

        mediaSession.setActive(true);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_UPDATE_STATE.equals(action)) {
                if (isNativeMode) {
                    // JS has moved playback to a different (non-native)
                    // track/station while native mode was active for the
                    // previous one — tear the native player down first so
                    // the two engines can never both hold audio focus.
                    releaseNativePlayer();
                }
                updateState(
                    intent.getStringExtra("title"),
                    intent.getStringExtra("artist"),
                    intent.getParcelableExtra("artworkBitmap"),
                    intent.getBooleanExtra("playing", false),
                    intent.getLongExtra("positionMs", 0),
                    intent.getLongExtra("durationMs", 0)
                );
            } else if (ACTION_PLAY_NATIVE.equals(action)) {
                String url = intent.getStringExtra("url");
                nativeTitle = intent.getStringExtra("title");
                nativeArtist = intent.getStringExtra("artist");
                lastNativeUrl = url;
                isNativeMode = true;
                nativeRetryCount = 0;
                // Push a state/notification synchronously *before* touching
                // ExoPlayer at all: startForeground() must be called within
                // a few seconds of startForegroundService() regardless of
                // how long the stream itself takes to connect/buffer, or
                // Android kills the app with a RemoteServiceException. This
                // guarantees that regardless of network speed.
                pushNativeState(false);
                if (url != null) startNativeExoPlayer(url);
            } else if (ACTION_PAUSE_NATIVE.equals(action)) {
                pauseNative();
            } else if (ACTION_RESUME_NATIVE.equals(action)) {
                resumeNative();
            } else if (ACTION_UPDATE_NATIVE_ARTWORK.equals(action)) {
                Bitmap art = intent.getParcelableExtra("artworkBitmap");
                if (art != null && isNativeMode) {
                    updateState(nativeTitle, nativeArtist, art, nativePlayer != null && nativePlayer.isPlaying(), 0, 0);
                }
            } else if (ACTION_STOP.equals(action)) {
                stopSession();
            } else {
                MediaButtonReceiver.handleIntent(mediaSession, intent);
            }
        }
        // Sticky: if the OS kills this service under memory pressure while a
        // stream is live, it restarts and JS re-syncs it on the next state
        // update rather than leaving playback silently dead.
        return START_STICKY;
    }

    public static final String ACTION_UPDATE_STATE = "com.zadalmuslim.app.media.UPDATE_STATE";
    public static final String ACTION_STOP = "com.zadalmuslim.app.media.STOP";
    public static final String ACTION_PLAY_NATIVE = "com.zadalmuslim.app.media.PLAY_NATIVE";
    public static final String ACTION_PAUSE_NATIVE = "com.zadalmuslim.app.media.PAUSE_NATIVE";
    public static final String ACTION_RESUME_NATIVE = "com.zadalmuslim.app.media.RESUME_NATIVE";
    public static final String ACTION_UPDATE_NATIVE_ARTWORK = "com.zadalmuslim.app.media.UPDATE_NATIVE_ARTWORK";

    private void pauseNative() {
        if (nativePlayer != null) nativePlayer.pause();
        pushNativeState(false);
    }

    private void resumeNative() {
        if (nativePlayer != null) {
            nativePlayer.play();
            pushNativeState(true);
        } else if (lastNativeUrl != null) {
            // The player instance is gone (process death / low-memory
            // reclaim) but JS still thinks native playback is active —
            // start it fresh from the last known URL instead of doing
            // nothing, which would otherwise look like a silent failure.
            isNativeMode = true;
            nativeRetryCount = 0;
            pushNativeState(false);
            startNativeExoPlayer(lastNativeUrl);
        }
    }

    /** Reflects native ExoPlayer state into the same MediaSessionCompat/notification the web-mirror path uses. */
    private void pushNativeState(boolean playing) {
        // A live stream has no meaningful duration/position to show — 0/0
        // is exactly what the web-mirror path already sends for live radio
        // tracks (see AudioPlayerProvider), so the notification/lock-screen
        // behaves identically either way.
        //
        // Deliberately never passes `lastArtwork` straight through here —
        // that field can still be holding a *previous, unrelated* track's
        // bitmap at the moment ACTION_PLAY_NATIVE first fires. Passing null
        // and letting updateState()'s own track-key check decide whether to
        // keep it or fall back to the default branding image is what
        // actually prevents that leak; real artwork for this track only
        // ever arrives via ACTION_UPDATE_NATIVE_ARTWORK below, once the
        // async download finishes — exactly mirroring the web-mirror path.
        updateState(nativeTitle, nativeArtist, null, playing, 0, 0);
    }

    private final Player.Listener nativePlayerListener = new Player.Listener() {
        @Override
        public void onIsPlayingChanged(boolean playing) {
            if (!isNativeMode) return;
            if (playing) nativeRetryCount = 0; // a real "now playing" clears the failure counter
            pushNativeState(playing);
            MediaSessionPlugin.notifyNativeRadioState(playing ? "playing" : "paused");
        }

        @Override
        public void onPlaybackStateChanged(int playbackState) {
            if (!isNativeMode) return;
            if (playbackState == Player.STATE_BUFFERING) {
                MediaSessionPlugin.notifyNativeRadioState("buffering");
            } else if (playbackState == Player.STATE_ENDED) {
                // A live stream "ending" on its own means the connection
                // dropped, not that there's nothing left to play — treat it
                // the same as a recoverable error rather than just stopping.
                handleNativePlaybackFailure();
            }
        }

        @Override
        public void onPlayerError(PlaybackException error) {
            if (!isNativeMode) return;
            handleNativePlaybackFailure();
        }
    };

    /**
     * Bounded, backed-off automatic reconnect for a dropped/failed live
     * stream — mirrors the JS-side reconnect behaviour used for every other
     * radio station (AudioPlayerProvider.scheduleResume) so both playback
     * paths feel consistent, and so a flaky connection can't spin retries
     * fast enough to drain the battery or hammer RadioJar's edge.
     */
    private void handleNativePlaybackFailure() {
        if (!isNativeMode) return;
        if (nativeRetryRunnable != null) return; // an attempt is already queued
        if (nativeRetryCount >= MAX_NATIVE_RETRIES || lastNativeUrl == null) {
            MediaSessionPlugin.notifyNativeRadioState("error");
            releaseNativePlayer();
            stopForeground(true);
            return;
        }
        nativeRetryCount++;
        long delayMs = Math.min(1000L * (1L << nativeRetryCount), 15000L);
        MediaSessionPlugin.notifyNativeRadioState("buffering");
        final String urlToRetry = lastNativeUrl;
        nativeRetryRunnable = () -> {
            nativeRetryRunnable = null;
            if (isNativeMode) startNativeExoPlayer(urlToRetry);
        };
        nativeRetryHandler.postDelayed(nativeRetryRunnable, delayMs);
    }

    /**
     * Builds and starts a fresh ExoPlayer instance pointed at {@code url}.
     * Always builds a new instance rather than reusing/re-preparing an old
     * one after a failure — ExoPlayer doesn't guarantee a clean recovery
     * from every error type via re-prepare, and a fresh instance is simpler
     * to reason about and guarantees no leftover state from the failure.
     */
    private void startNativeExoPlayer(String url) {
        if (nativePlayer != null) {
            nativePlayer.removeListener(nativePlayerListener);
            nativePlayer.release();
            nativePlayer = null;
        }

        DefaultHttpDataSource.Factory httpDataSourceFactory = new DefaultHttpDataSource.Factory()
            .setUserAgent("ZadAlmuslimApp/Android")
            // RadioJar's edge sometimes 30x-redirects this https:// request
            // to a *different* host over plain http:// (see class doc for
            // the exact Logcat evidence) — ExoPlayer refuses that
            // cross-protocol redirect by default for the same reason a
            // browser would; this is the documented way to trust it for a
            // source we've deliberately chosen to allow (paired with the
            // radiojar.com cleartext exception in network_security_config.xml,
            // which is the second half of this same fix — this flag alone
            // only stops ExoPlayer *itself* from refusing the redirect, it
            // doesn't override Android's separate socket-level cleartext
            // policy).
            .setAllowCrossProtocolRedirects(true)
            .setConnectTimeoutMs(15000)
            .setReadTimeoutMs(15000);

        nativePlayer = new ExoPlayer.Builder(this)
            .setMediaSourceFactory(new DefaultMediaSourceFactory(httpDataSourceFactory))
            .build();
        // handleAudioFocus=true: ExoPlayer automatically pauses on focus
        // loss (another app playing audio), ducks for transient focus loss
        // (e.g. a short notification sound), and resumes when focus returns
        // — the same behavior the shared <audio> element gets for free from
        // the browser engine, so native mode doesn't feel different here.
        nativePlayer.setAudioAttributes(
            new AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .build(),
            /* handleAudioFocus= */ true
        );
        // Pauses automatically on headphone/Bluetooth disconnect instead of
        // suddenly blasting through the phone's speaker.
        nativePlayer.setHandleAudioBecomingNoisy(true);
        nativePlayer.addListener(nativePlayerListener);
        nativePlayer.setMediaItem(MediaItem.fromUri(url));
        nativePlayer.setPlayWhenReady(true);
        nativePlayer.prepare();
    }

    private void releaseNativePlayer() {
        if (nativeRetryRunnable != null) {
            nativeRetryHandler.removeCallbacks(nativeRetryRunnable);
            nativeRetryRunnable = null;
        }
        if (nativePlayer != null) {
            nativePlayer.removeListener(nativePlayerListener);
            nativePlayer.release();
            nativePlayer = null;
        }
        isNativeMode = false;
    }

    /** Called from {@link #onStartCommand} whenever the web player's state changes. */
    private void updateState(
        String title,
        String artist,
        Bitmap artworkBitmap,
        boolean playing,
        long positionMs,
        long durationMs
    ) {
        // Bug this fixes: a track with no artwork of its own (many reciters/
        // tawashih tracks, and the hand-added Cairo radio entry, have none)
        // used to silently keep whatever `lastArtwork` bitmap the *previous*,
        // completely unrelated track had downloaded — so the notification
        // could show, say, a past reciter's photo on top of a radio station
        // that has no photo at all, indefinitely, until some later track
        // happened to have its own artwork. A track is identified by its
        // title+artist pair here; when that pair changes and no fresh
        // artwork has arrived for it (yet, or ever), fall back to the app's
        // own branding image instead of carrying the old one over.
        String trackKey = title + "|" + artist;
        if (artworkBitmap != null) {
            lastArtwork = artworkBitmap;
            lastArtworkTrackKey = trackKey;
        } else if (!trackKey.equals(lastArtworkTrackKey)) {
            lastArtwork = getDefaultArtwork();
            lastArtworkTrackKey = trackKey;
        }

        MediaMetadataCompat.Builder metaBuilder = new MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "زَادُ المُسْلِم")
            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, Math.max(durationMs, 0));
        if (lastArtwork != null) {
            metaBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, lastArtwork);
        }
        mediaSession.setMetadata(metaBuilder.build());

        int state = playing ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED;
        stateBuilder.setState(state, positionMs, playing ? 1f : 0f);
        mediaSession.setPlaybackState(stateBuilder.build());

        startForeground(NOTIFICATION_ID, buildNotification(title, artist, playing));
    }

    /** The app's own branding image from res/drawable, decoded once and reused. */
    private Bitmap getDefaultArtwork() {
        if (defaultArtwork == null) {
            defaultArtwork = BitmapFactory.decodeResource(getResources(), com.zadalmuslim2079.app.R.drawable.ic_notify_large);
        }
        return defaultArtwork;
    }

    void stopSession() {
        releaseNativePlayer();
        mediaSession.setActive(false);
        stopForeground(true);
        stopSelf();
    }

    private Notification buildNotification(String title, String artist, boolean playing) {
        Intent contentIntent = new Intent(this, MainActivity.class);
        PendingIntent contentPendingIntent = PendingIntent.getActivity(
            this,
            0,
            contentIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        PendingIntent playPausePendingIntent = MediaButtonReceiver.buildMediaButtonPendingIntent(
            this,
            playing ? PlaybackStateCompat.ACTION_PAUSE : PlaybackStateCompat.ACTION_PLAY
        );
        PendingIntent previousPendingIntent = MediaButtonReceiver.buildMediaButtonPendingIntent(
            this,
            PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
        );
        PendingIntent nextPendingIntent = MediaButtonReceiver.buildMediaButtonPendingIntent(
            this,
            PlaybackStateCompat.ACTION_SKIP_TO_NEXT
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(com.zadalmuslim2079.app.R.drawable.ic_stat_notify)
            .setContentTitle(title)
            .setContentText(artist)
            // Album/station artwork here is what the system uses as this
            // app's icon in the Android 13+ media output/volume card and the
            // lock-screen "Now Playing" surface — without it those surfaces
            // fall back to a generic look with no app branding.
            .setLargeIcon(lastArtwork)
            .setContentIntent(contentPendingIntent)
            .setOnlyAlertOnce(true)
            .setOngoing(playing)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            // All three explicit actions on the notification itself — the
            // session's declared actions (ACTION_SKIP_TO_NEXT/PREVIOUS)
            // are not reliably enough on their own to make some OEM/older
            // Android media widgets draw previous/next buttons; adding them
            // here directly guarantees they always show.
            .addAction(android.R.drawable.ic_media_previous, "السابق", previousPendingIntent)
            .addAction(
                playing ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                playing ? "إيقاف" : "تشغيل",
                playPausePendingIntent
            )
            .addAction(android.R.drawable.ic_media_next, "التالي", nextPendingIntent)
            .setStyle(
                new MediaStyle()
                    .setMediaSession(mediaSession.getSessionToken())
                    .setShowActionsInCompactView(0, 1, 2)
            );

        return builder.build();
    }

    private void createChannelIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "التشغيل الصوتي",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("عناصر تحكم التشغيل للإذاعة والتلاوات والأناشيد");
            channel.setShowBadge(false);
            manager.createNotificationChannel(channel);
        }
    }

    @Override
    public void onDestroy() {
        releaseNativePlayer();
        mediaSession.release();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}

