package com.zadalmuslim.app.media;

import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Base64InputStream;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Saves a video generated entirely in JS (the Quran video generator's
 * MediaRecorder output) directly into the device's shared video library —
 * no share sheet, no app chooser, no "choose a destination" prompt. This is
 * specifically the piece a plain {@code <a download>} on a {@code blob:}
 * URL cannot do inside the Capacitor Android WebView: MainActivity's
 * WebView {@code DownloadListener} only ever sees real http(s) downloads,
 * never in-memory blob: content, so a generated video "download" silently
 * did nothing there even though the exact same markup works on the website.
 *
 * <p><b>Why chunked, not one call:</b> sending an entire video as one giant
 * base64 string across a single plugin call is unreliable on real devices —
 * a multi-ten-megabyte single bridge message is a known way to make the
 * Capacitor JS↔native bridge choke, stall, or fail outright. This plugin
 * instead opens a session ({@link #startSave}), accepts many small base64
 * chunks ({@link #appendChunk}), and only then finalizes the file
 * ({@link #finishSave}) — every individual bridge message stays small
 * regardless of the overall video size.
 *
 * <p>Android 10+ (API 29, {@link Build.VERSION_CODES#Q}): writes straight
 * into {@link MediaStore} with no runtime permission at all — under scoped
 * storage, any app can insert its own media into the shared collections
 * without {@code READ/WRITE_EXTERNAL_STORAGE}. The insert-as-pending /
 * write-in-chunks / un-pend sequence is the standard, documented pattern.
 *
 * <p>Android 9 and below (API 24-28 — the bottom of this app's minSdk):
 * scoped storage doesn't exist yet, so this falls back to a real file write
 * into the public Movies directory, which does need
 * {@code WRITE_EXTERNAL_STORAGE} — requested here at runtime only on these
 * older versions. The manifest declares that permission with
 * {@code android:maxSdkVersion="28"}, so it's inert on every newer device.
 */
@CapacitorPlugin(
    name = "VideoSaver",
    permissions = { @Permission(strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE }, alias = "storage") }
)
public class VideoSaverPlugin extends Plugin {

    private static class Session {
        Uri mediaStoreUri; // set on the Android 10+ (MediaStore) path
        File legacyFile; // set on the pre-Android-10 (direct file) path
        OutputStream stream;
        String mimeType;
    }

    private final Map<String, Session> sessions = new ConcurrentHashMap<>();

    @PluginMethod
    public void startSave(PluginCall call) {
        String fileName = sanitizeFileName(call.getString("fileName"));
        String mimeType = call.getString("mimeType", "video/webm");
        String album = call.getString("album", "زاد المسلم");

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // No permission needed at all on modern Android — go straight to it.
            startMediaStoreSession(call, fileName, mimeType, album);
            return;
        }

        if (getPermissionState("storage") == PermissionState.GRANTED) {
            startLegacySession(call, fileName, mimeType, album);
        } else {
            requestPermissionForAlias("storage", call, "storagePermissionCallback");
        }
    }

    @PermissionCallback
    private void storagePermissionCallback(PluginCall call) {
        if (getPermissionState("storage") != PermissionState.GRANTED) {
            call.reject("تعذّر حفظ الفيديو لأن إذن الوصول إلى التخزين غير ممنوح");
            return;
        }
        String fileName = sanitizeFileName(call.getString("fileName"));
        String mimeType = call.getString("mimeType", "video/webm");
        String album = call.getString("album", "زاد المسلم");
        startLegacySession(call, fileName, mimeType, album);
    }

    private void startMediaStoreSession(PluginCall call, String fileName, String mimeType, String album) {
        ContentResolver resolver = getContext().getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.Video.Media.DISPLAY_NAME, fileName);
        values.put(MediaStore.Video.Media.MIME_TYPE, mimeType);
        values.put(MediaStore.Video.Media.RELATIVE_PATH, Environment.DIRECTORY_MOVIES + "/" + album);
        values.put(MediaStore.Video.Media.IS_PENDING, 1);

        Uri itemUri = null;
        try {
            itemUri = resolver.insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, values);
            if (itemUri == null) {
                call.reject("تعذّر إنشاء عنصر الفيديو في مكتبة الوسائط");
                return;
            }
            OutputStream out = resolver.openOutputStream(itemUri);
            if (out == null) {
                resolver.delete(itemUri, null, null);
                call.reject("تعذّر فتح مجرى الكتابة");
                return;
            }

            Session session = new Session();
            session.mediaStoreUri = itemUri;
            session.stream = out;
            session.mimeType = mimeType;
            String sessionId = UUID.randomUUID().toString();
            sessions.put(sessionId, session);

            JSObject result = new JSObject();
            result.put("sessionId", sessionId);
            call.resolve(result);
        } catch (Exception e) {
            if (itemUri != null) {
                try {
                    resolver.delete(itemUri, null, null);
                } catch (Exception ignored) {
                    // Best effort cleanup only.
                }
            }
            call.reject("تعذّر بدء حفظ الفيديو: " + e.getMessage(), e);
        }
    }

    private void startLegacySession(PluginCall call, String fileName, String mimeType, String album) {
        try {
            File moviesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES);
            File albumDir = new File(moviesDir, album);
            if (!albumDir.exists() && !albumDir.mkdirs()) {
                call.reject("تعذّر إنشاء مجلد الحفظ");
                return;
            }
            File outFile = new File(albumDir, fileName);

            Session session = new Session();
            session.legacyFile = outFile;
            session.stream = new FileOutputStream(outFile);
            session.mimeType = mimeType;
            String sessionId = UUID.randomUUID().toString();
            sessions.put(sessionId, session);

            JSObject result = new JSObject();
            result.put("sessionId", sessionId);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("تعذّر بدء حفظ الفيديو: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void appendChunk(PluginCall call) {
        String sessionId = call.getString("sessionId");
        String data = call.getString("data");
        Session session = sessionId != null ? sessions.get(sessionId) : null;
        if (session == null) {
            call.reject("جلسة الحفظ غير موجودة أو انتهت بالفعل");
            return;
        }
        if (data == null || data.isEmpty()) {
            call.resolve();
            return;
        }
        try {
            writeBase64Chunk(data, session.stream);
            call.resolve();
        } catch (Exception e) {
            sessions.remove(sessionId);
            cleanupFailedSession(session);
            call.reject("تعذّر كتابة بيانات الفيديو: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void finishSave(PluginCall call) {
        String sessionId = call.getString("sessionId");
        Session session = sessionId != null ? sessions.remove(sessionId) : null;
        if (session == null) {
            call.reject("جلسة الحفظ غير موجودة أو انتهت بالفعل");
            return;
        }
        try {
            session.stream.flush();
            session.stream.close();

            if (session.mediaStoreUri != null) {
                ContentValues done = new ContentValues();
                done.put(MediaStore.Video.Media.IS_PENDING, 0);
                getContext().getContentResolver().update(session.mediaStoreUri, done, null, null);

                JSObject result = new JSObject();
                result.put("uri", session.mediaStoreUri.toString());
                call.resolve(result);
            } else if (session.legacyFile != null) {
                // Pre-scoped-storage devices need an explicit media scan for
                // the new file to actually show up in the Movies/Gallery
                // app — a raw file write alone doesn't register it with
                // MediaStore the way an insert() does on Android 10+.
                MediaScannerConnection.scanFile(
                    getContext(),
                    new String[] { session.legacyFile.getAbsolutePath() },
                    new String[] { session.mimeType },
                    null
                );

                JSObject result = new JSObject();
                result.put("uri", Uri.fromFile(session.legacyFile).toString());
                call.resolve(result);
            } else {
                call.reject("حالة حفظ غير متوقعة");
            }
        } catch (Exception e) {
            // Never leave a half-written MediaStore row stuck with
            // IS_PENDING=1 (looks permanently "processing"/broken in the
            // Movies app) or a truncated legacy file behind.
            cleanupFailedSession(session);
            call.reject("تعذّر إنهاء حفظ الفيديو: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void abortSave(PluginCall call) {
        String sessionId = call.getString("sessionId");
        Session session = sessionId != null ? sessions.remove(sessionId) : null;
        if (session != null) cleanupFailedSession(session);
        call.resolve();
    }

    private void cleanupFailedSession(Session session) {
        try {
            session.stream.close();
        } catch (Exception ignored) {
            // Best effort only.
        }
        if (session.mediaStoreUri != null) {
            try {
                getContext().getContentResolver().delete(session.mediaStoreUri, null, null);
            } catch (Exception ignored) {
                // Best effort only.
            }
        }
        if (session.legacyFile != null && session.legacyFile.exists()) {
            //noinspection ResultOfMethodCallIgnored
            session.legacyFile.delete();
        }
    }

    /** Strips path separators/parent-dir references so `fileName` can never escape the target directory. */
    private String sanitizeFileName(String name) {
        if (name == null || name.trim().isEmpty()) {
            return "video_" + System.currentTimeMillis() + ".webm";
        }
        String cleaned = name.replaceAll("[\\\\/]+", "_").replace("..", "_").trim();
        return cleaned.isEmpty() ? "video_" + System.currentTimeMillis() + ".webm" : cleaned;
    }

    /**
     * Decodes and writes a single base64 chunk in a streamed pass, instead
     * of materializing a fully-decoded byte[] copy of the chunk in memory on
     * top of the base64 string the JS side already sent as text.
     */
    private void writeBase64Chunk(String base64Data, OutputStream out) throws Exception {
        byte[] ascii = base64Data.getBytes(StandardCharsets.US_ASCII);
        try (InputStream in = new Base64InputStream(new ByteArrayInputStream(ascii), Base64.DEFAULT)) {
            byte[] buffer = new byte[8192];
            int len;
            while ((len = in.read(buffer)) != -1) {
                out.write(buffer, 0, len);
            }
        }
    }
}
