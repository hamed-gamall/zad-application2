package com.zadalmuslim.app;

import android.app.DownloadManager;
import android.content.Context;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.CookieManager;
import android.widget.Toast;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;
import com.zadalmuslim.app.athan.AthanSchedulerPlugin;
import com.zadalmuslim.app.media.MediaSessionPlugin;
import com.zadalmuslim.app.media.VideoSaverPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Must be called before super.onCreate() — this is what actually
        // switches the launch theme over to the real Android 12+ SplashScreen
        // API instead of the old drawable-behind-the-window trick.
        SplashScreen.installSplashScreen(this);

        // Register the custom plugin that gives the radio/reciter/tawashih
        // player a real Android lock-screen notification and a foreground
        // service, before the Bridge is created.
        registerPlugin(MediaSessionPlugin.class);
        // Bridges the JS-computed prayer-time schedule to native AlarmManager
        // so the full Athan recording plays via a foreground service, even
        // while the app isn't running (see android/.../athan/).
        registerPlugin(AthanSchedulerPlugin.class);
        // Saves a JS-generated video (the Quran video generator) straight
        // into the device's Movies library via MediaStore — see
        // VideoSaverPlugin's doc comment for why a plain <a download> can't
        // do this for a blob: URL.
        registerPlugin(VideoSaverPlugin.class);

        super.onCreate(savedInstanceState);

        // Edge-to-edge: let our own WebView content (with safe-area-inset CSS
        // padding) draw under the status/navigation bars instead of the
        // system reserving a plain, mismatched strip above the page — that
        // reserved strip is what made the app look like it wasn't taking the
        // full screen.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Show a friendly, bundled "no internet" page instead of Android's
        // default blank/black error page when the live app fails to load.
        getBridge().setWebViewClient(new OfflineWebViewClient(getBridge()));

        // Ignore the phone's system "font size" for the web content. Without
        // this, a large system font/display size scales the whole WebView
        // (textZoom > 100%) and pages look huge and spill off-screen. The app
        // has its own font-size slider in Settings instead.
        getBridge().getWebView().getSettings().setTextZoom(100);

        // A plain Android WebView silently ignores <a download> links and
        // file/blob downloads — that "just does nothing" behaviour is exactly
        // the kind of thing that works perfectly in a real browser (the
        // website) but looks broken inside the app. Route those requests to
        // Android's own DownloadManager instead, which shows a real progress
        // notification and saves the file where the person can find it.
        getBridge().getWebView().setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            try {
                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                String cookie = CookieManager.getInstance().getCookie(url);
                if (cookie != null) request.addRequestHeader("Cookie", cookie);
                request.addRequestHeader("User-Agent", userAgent);
                String fileName = android.webkit.URLUtil.guessFileName(url, contentDisposition, mimeType);
                request.setMimeType(mimeType);
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
                DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                dm.enqueue(request);
                Toast.makeText(this, "جارٍ التنزيل إلى مجلد التنزيلات…", Toast.LENGTH_SHORT).show();
            } catch (Exception e) {
                Toast.makeText(this, "تعذّر بدء التنزيل", Toast.LENGTH_SHORT).show();
            }
        });
    }
}
