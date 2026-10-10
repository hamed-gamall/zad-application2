package com.zadalmuslim.app.athan;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/**
 * Fired by {@link android.app.AlarmManager} at the exact moment a prayer
 * time is reached (scheduled by {@link AthanScheduler}), whether or not the
 * app is running. Its only job is to hand off to {@link AthanPlaybackService},
 * which does the actual foreground playback.
 */
public class AthanAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String muezzinRaw = intent.getStringExtra("muezzinRaw");
        String label = intent.getStringExtra("label");

        Intent serviceIntent = new Intent(context, AthanPlaybackService.class);
        serviceIntent.setAction(AthanPlaybackService.ACTION_PLAY);
        serviceIntent.putExtra("muezzinRaw", muezzinRaw);
        serviceIntent.putExtra("label", label);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }
    }
}
