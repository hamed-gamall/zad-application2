package com.zadalmuslim.app.athan;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Schedules exact {@link AlarmManager} alarms that fire {@link AthanAlarmReceiver}
 * at each upcoming prayer time, independent of whether the app process is
 * alive — this is what lets the full Athan recording actually play (via
 * {@link AthanPlaybackService}) instead of the few-second notification sound
 * Android would otherwise cap it to.
 *
 * The scheduled list is persisted to SharedPreferences so {@link AthanBootReceiver}
 * can re-arm every future alarm after a reboot (the OS clears all AlarmManager
 * alarms on reboot; the app itself can't run in the background to re-fire this
 * scheduling code the way it does when opened normally).
 */
public final class AthanScheduler {
    private static final String PREFS = "athan_schedule";
    private static final String KEY_ITEMS = "items";
    private static final int REQUEST_CODE_BASE = 90000; // separate range from any other alarm use

    private AthanScheduler() {}

    public static final class Item {
        public final int id;
        public final long atMillis;
        public final String muezzinRaw; // raw resource name, e.g. "athan_makkah"
        public final String label; // e.g. "الفجر"

        public Item(int id, long atMillis, String muezzinRaw, String label) {
            this.id = id;
            this.atMillis = atMillis;
            this.muezzinRaw = muezzinRaw;
            this.label = label;
        }
    }

    /** Cancels every previously-scheduled alarm from this scheduler, then schedules `items`. */
    public static void reschedule(Context context, List<Item> items) {
        cancelAll(context);
        List<Item> future = new ArrayList<>();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        for (Item item : items) {
            if (item.atMillis <= System.currentTimeMillis()) continue;
            future.add(item);
            scheduleOne(context, alarmManager, item);
        }
        persist(context, future);
    }

    /** Re-arms every still-future alarm from the persisted list. Called after boot/app update. */
    public static void restoreFromPersisted(Context context) {
        List<Item> items = readPersisted(context);
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        List<Item> future = new ArrayList<>();
        for (Item item : items) {
            if (item.atMillis <= System.currentTimeMillis()) continue;
            future.add(item);
            scheduleOne(context, alarmManager, item);
        }
        persist(context, future);
    }

    public static void cancelAll(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        for (Item item : readPersisted(context)) {
            PendingIntent pi = buildPendingIntent(context, item.id, item.muezzinRaw, item.label);
            if (pi != null) alarmManager.cancel(pi);
        }
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY_ITEMS).apply();
    }

    private static void scheduleOne(Context context, AlarmManager alarmManager, Item item) {
        PendingIntent pi = buildPendingIntent(context, item.id, item.muezzinRaw, item.label);
        if (pi == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
                // No "Alarms & reminders" permission — best effort, may arrive
                // a little late. The regular capacitor local-notification the
                // JS side also schedules still shows an on-time banner either way.
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, item.atMillis, pi);
            } else {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, item.atMillis, pi);
            }
        } catch (SecurityException e) {
            // Some OEMs revoke exact-alarm scheduling silently — fall back to inexact.
            try {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, item.atMillis, pi);
            } catch (RuntimeException e2) {
                // See the RuntimeException catch below — same reasoning applies
                // to this fallback attempt too.
            }
        } catch (RuntimeException e) {
            // Defense in depth against AlarmManagerService's undocumented but
            // very real hard cap of 500 concurrently-registered alarms per
            // app (throws IllegalStateException("Too many alarms (500)
            // registered for uid ...") once hit) and any other OEM-specific
            // AlarmManager restriction. The scheduling window is now kept
            // small enough on the JS side (see ATHAN_DAYS_AHEAD in
            // schedule.ts) that this should never actually be reached, but a
            // single skipped alarm here must never be able to take the whole
            // app down with it — that was the entire original bug.
        }
    }

    private static PendingIntent buildPendingIntent(
        Context context,
        int id,
        String muezzinRaw,
        String label
    ) {
        Intent intent = new Intent(context, AthanAlarmReceiver.class);
        intent.putExtra("muezzinRaw", muezzinRaw);
        intent.putExtra("label", label);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(context, REQUEST_CODE_BASE + id, intent, flags);
    }

    private static void persist(Context context, List<Item> items) {
        JSONArray arr = new JSONArray();
        for (Item item : items) {
            JSONObject o = new JSONObject();
            try {
                o.put("id", item.id);
                o.put("atMillis", item.atMillis);
                o.put("muezzinRaw", item.muezzinRaw);
                o.put("label", item.label);
                arr.put(o);
            } catch (JSONException ignored) {
            }
        }
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_ITEMS, arr.toString()).apply();
    }

    private static List<Item> readPersisted(Context context) {
        List<Item> out = new ArrayList<>();
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String raw = prefs.getString(KEY_ITEMS, null);
        if (raw == null) return out;
        try {
            JSONArray arr = new JSONArray(raw);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.getJSONObject(i);
                out.add(new Item(o.getInt("id"), o.getLong("atMillis"), o.getString("muezzinRaw"), o.getString("label")));
            }
        } catch (JSONException ignored) {
        }
        return out;
    }
}
