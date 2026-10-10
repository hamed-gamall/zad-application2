package com.zadalmuslim.app.athan;

import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Lets the JS side (which already computes accurate prayer times offline via
 * adhan.js) hand the upcoming Athan schedule to native AlarmManager, so the
 * full recording plays via {@link AthanPlaybackService} even while the app
 * isn't running. This is separate from — and in addition to —
 * @capacitor/local-notifications, which still shows the visible "حان الآن
 * وقت صلاة..." banner; this plugin is only responsible for the actual audio.
 */
@CapacitorPlugin(name = "AthanScheduler")
public class AthanSchedulerPlugin extends Plugin {

    @PluginMethod
    public void schedule(PluginCall call) {
        JSArray itemsArray = call.getArray("items");
        List<AthanScheduler.Item> items = new ArrayList<>();
        if (itemsArray != null) {
            try {
                for (int i = 0; i < itemsArray.length(); i++) {
                    JSONObject o = itemsArray.getJSONObject(i);
                    items.add(
                        new AthanScheduler.Item(
                            o.getInt("id"),
                            o.getLong("atMillis"),
                            o.getString("muezzinRaw"),
                            o.optString("label", "الصلاة")
                        )
                    );
                }
            } catch (JSONException e) {
                call.reject("Invalid schedule items", e);
                return;
            }
        }
        try {
            AthanScheduler.reschedule(getContext(), items);
        } catch (RuntimeException e) {
            // scheduleOne() inside AthanScheduler already catches its own
            // per-alarm failures, but this is one more layer of defense: a
            // plugin method running on the Capacitor bridge thread must
            // never be able to throw uncaught and crash the app.
            call.reject("Failed to schedule athan alarms", e);
            return;
        }
        call.resolve();
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        AthanScheduler.cancelAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void stopCurrent(PluginCall call) {
        android.content.Intent intent = new android.content.Intent(getContext(), AthanPlaybackService.class);
        intent.setAction(AthanPlaybackService.ACTION_STOP);
        try {
            getContext().startService(intent);
        } catch (Exception ignored) {
        }
        call.resolve();
    }
}
