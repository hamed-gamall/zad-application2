package com.zadalmuslim.app.athan;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Android clears every {@link android.app.AlarmManager} alarm on reboot (and
 * some OEMs clear them on an app update too). Without this, someone who
 * enabled Athan and then restarted their phone would silently get no more
 * Athan playback until they happened to reopen the app. This just re-arms
 * whatever is left in the persisted schedule — it does not recompute prayer
 * times itself; the next app open still refreshes the full 70-day window as
 * usual via the JS side.
 */
public class AthanBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
            || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
            || "android.intent.action.QUICKBOOT_POWERON".equals(action)) {
            AthanScheduler.restoreFromPersisted(context);
        }
    }
}
