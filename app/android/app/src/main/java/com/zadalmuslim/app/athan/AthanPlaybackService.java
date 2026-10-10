package com.zadalmuslim.app.athan;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;
import com.zadalmuslim.app.MainActivity;

/**
 * Plays the full Athan recording as a real foreground-service media playback
 * (like {@link com.zadalmuslim.app.media.MediaPlaybackService} does for
 * radio/reciters), instead of relying on a notification-channel "sound" —
 * which Android treats as a short ringtone-style alert that can get cut off
 * as soon as the screen turns on or the notification is expanded, rather
 * than actually playing the whole call to prayer.
 *
 * The notification this shows is deliberately "ongoing" (not swipe-
 * dismissible) while the Athan is playing, with an explicit "إيقاف الأذان"
 * action — matching how alarm-clock apps behave, so it keeps playing
 * through screen unlocks / app switches and stops only when the user
 * presses Stop or it finishes naturally.
 */
public class AthanPlaybackService extends Service {
    public static final String ACTION_PLAY = "com.zadalmuslim.app.athan.PLAY";
    public static final String ACTION_STOP = "com.zadalmuslim.app.athan.STOP";

    private static final String CHANNEL_ID = "athan_playback";
    private static final int NOTIFICATION_ID = 5552;

    private MediaPlayer mediaPlayer;
    private PowerManager.WakeLock wakeLock;
    private String currentLabel = "الأذان";

    // ---- "Flip to silence": lay the phone face-down while the Athan is
    // playing and it goes quiet, the same gesture many phones already use to
    // silence an incoming call or notification. ----
    private SensorManager sensorManager;
    private Sensor accelerometer;
    private boolean mutedByFlip = false;
    private long faceDownSinceMs = 0;
    // Earth's gravity is ~9.8 m/s²; comfortably past halfway there is enough
    // margin to tell "face-down" apart from a phone merely tilted while held.
    private static final float FACE_DOWN_Z_THRESHOLD = -7.0f;
    // Face-down also means resting fairly flat — x/y should be small — which
    // rules out a phone that's simply upside-down but propped at an angle.
    // Loosened from 3.0 to 4.5: a real-world flip is rarely perfectly flat,
    // and the old, tighter tolerance meant a normal flip often just missed
    // the window and had to be repeated several times before it registered.
    private static final float FLAT_XY_TOLERANCE = 4.5f;
    // Must stay face-down this long before muting, so a quick flip while
    // picking the phone up (to read the notification, say) doesn't trigger it.
    // Shortened from 400ms to 200ms — combined with the faster sensor rate
    // below, this cuts the total flip-to-mute delay noticeably while still
    // being long enough to filter out an accidental brush of the phone.
    private static final long FACE_DOWN_HOLD_MS = 200;

    private final SensorEventListener flipListener = new SensorEventListener() {
        @Override
        public void onSensorChanged(SensorEvent event) {
            if (mutedByFlip || event.values.length < 3) return;
            float x = event.values[0];
            float y = event.values[1];
            float z = event.values[2];
            boolean facingDown = z < FACE_DOWN_Z_THRESHOLD && Math.abs(x) < FLAT_XY_TOLERANCE && Math.abs(y) < FLAT_XY_TOLERANCE;
            long now = System.currentTimeMillis();
            if (facingDown) {
                if (faceDownSinceMs == 0) faceDownSinceMs = now;
                if (now - faceDownSinceMs >= FACE_DOWN_HOLD_MS) {
                    muteForFlip();
                }
            } else {
                faceDownSinceMs = 0;
            }
        }

        @Override
        public void onAccuracyChanged(Sensor sensor, int accuracy) {}
    };

    @Override
    public void onCreate() {
        super.onCreate();
        createChannelIfNeeded();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;
        String action = intent.getAction();
        if (ACTION_STOP.equals(action)) {
            stopPlayback();
            return START_NOT_STICKY;
        }

        String muezzinRaw = intent.getStringExtra("muezzinRaw");
        String label = intent.getStringExtra("label");
        currentLabel = label != null ? label : "الأذان";
        startPlayback(muezzinRaw, currentLabel);
        return START_NOT_STICKY;
    }

    private void startPlayback(String muezzinRaw, String label) {
        stopPlaybackInternal(); // in case an alarm fires while a previous one is still playing

        int resId = 0;
        if (muezzinRaw != null) {
            resId = getResources().getIdentifier(muezzinRaw, "raw", getPackageName());
        }
        if (resId == 0) {
            resId = getResources().getIdentifier("athan_makkah", "raw", getPackageName());
        }

        startForeground(NOTIFICATION_ID, buildNotification(label));

        acquireWakeLock();

        try {
            mediaPlayer = MediaPlayer.create(this, resId);
            if (mediaPlayer == null) {
                stopPlayback();
                return;
            }
            mediaPlayer.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            );
            mediaPlayer.setOnCompletionListener(mp -> stopPlayback());
            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                stopPlayback();
                return true;
            });
            mediaPlayer.start();
            registerFlipListener();
        } catch (Exception e) {
            stopPlayback();
        }
    }

    private void registerFlipListener() {
        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        if (sensorManager == null) return;
        accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        if (accelerometer != null) {
            // SENSOR_DELAY_NORMAL only samples a few times a second, which is
            // the main reason the flip felt sluggish and often needed several
            // tries. SENSOR_DELAY_GAME samples much more often (~20ms), so a
            // face-down flip is detected almost immediately.
            sensorManager.registerListener(flipListener, accelerometer, SensorManager.SENSOR_DELAY_GAME);
        }
    }

    private void unregisterFlipListener() {
        if (sensorManager != null) {
            sensorManager.unregisterListener(flipListener);
        }
        faceDownSinceMs = 0;
        mutedByFlip = false;
    }

    /** Silences the Athan in place — the recording keeps playing (and the
     * notification/Stop button keep working normally) so a second flip or an
     * explicit Stop still behaves exactly as expected; only the sound itself
     * goes quiet. */
    private void muteForFlip() {
        if (mutedByFlip || mediaPlayer == null) return;
        mutedByFlip = true;
        try {
            mediaPlayer.setVolume(0f, 0f);
        } catch (IllegalStateException ignored) {
        }
    }

    private void stopPlayback() {
        stopPlaybackInternal();
        stopForeground(true);
        stopSelf();
    }

    private void stopPlaybackInternal() {
        unregisterFlipListener();
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) mediaPlayer.stop();
            } catch (IllegalStateException ignored) {
            }
            mediaPlayer.release();
            mediaPlayer = null;
        }
        releaseWakeLock();
    }

    private void acquireWakeLock() {
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm == null) return;
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "zadalmuslim:athan-playback");
        wakeLock.setReferenceCounted(false);
        // A full Athan recording is at most a few minutes — cap it generously
        // so a stuck wake lock can never drain the battery indefinitely.
        wakeLock.acquire(6 * 60 * 1000L);
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        wakeLock = null;
    }

    private Notification buildNotification(String label) {
        Intent contentIntent = new Intent(this, MainActivity.class);
        PendingIntent contentPendingIntent = PendingIntent.getActivity(
            this,
            0,
            contentIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent stopIntent = new Intent(this, AthanPlaybackService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPendingIntent = PendingIntent.getService(
            this,
            0,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(com.zadalmuslim2079.app.R.drawable.ic_stat_notify)
            .setContentTitle("حان الآن وقت صلاة " + label)
            .setContentText("الله أكبر، الله أكبر — حي على الصلاة، حي على الفلاح")
            .setContentIntent(contentPendingIntent)
            // Ongoing = not removable with a swipe, only via the explicit
            // Stop action below or once the recording finishes on its own —
            // this is the actual behaviour being asked for, phrased as
            // "not literally swiping it away".
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .addAction(android.R.drawable.ic_media_pause, "إيقاف الأذان", stopPendingIntent)
            // Defensive fallback: if an OEM's launcher lets the notification
            // get swiped away despite setOngoing(true), stop the audio
            // instead of leaving it playing with no visible way to stop it.
            .setDeleteIntent(stopPendingIntent)
            .build();
    }

    private void createChannelIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "تشغيل الأذان",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("تشغيل الأذان كاملاً عند دخول وقت الصلاة");
            channel.setShowBadge(false);
            // No channel `sound` here on purpose — the audio itself is played
            // through MediaPlayer/AudioAttributes below, not the notification
            // sound system (which is what was cutting it short before).
            channel.setSound(null, null);
            manager.createNotificationChannel(channel);
        }
    }

    @Override
    public void onDestroy() {
        stopPlaybackInternal();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
