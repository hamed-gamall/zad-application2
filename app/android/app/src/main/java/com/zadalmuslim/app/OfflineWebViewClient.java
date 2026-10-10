package com.zadalmuslim.app;

import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;

/**
 * This app's `server.url` (capacitor.config.ts) points at the real, live
 * production site — there is no locally-bundled web app to fall back to. If
 * the very first navigation to that URL fails (no internet, DNS failure,
 * timeout, ...), Android's default WebView error page renders as a plain,
 * unstyled, mostly blank/black page — exactly the "black screen" people were
 * seeing with no explanation of what went wrong.
 *
 * This intercepts a *main-frame* load failure only, and shows a small,
 * self-contained, branded HTML page bundled in the APK itself (works with
 * zero network access) with a clear Arabic explanation and a retry button.
 * Capacitor's own `server.errorPath` config option was not used here because
 * it resolves relative to the remote server's own host — which is exactly
 * what's unreachable when this fires.
 */
public class OfflineWebViewClient extends BridgeWebViewClient {
    private static final String OFFLINE_PAGE = "file:///android_asset/offline_fallback.html";

    public OfflineWebViewClient(Bridge bridge) {
        super(bridge);
    }

    @Override
    public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
        super.onReceivedError(view, request, error);
        if (request.isForMainFrame() && !isAlreadyShowingOfflinePage(view)) {
            view.loadUrl(OFFLINE_PAGE);
        }
    }

    @Override
    public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
        super.onReceivedHttpError(view, request, errorResponse);
        // Only treat server-side failures (5xx) as "app unreachable" — a 4xx
        // on the main document is a real app-level error page we should
        // still show normally, not mask with the offline screen.
        int status = errorResponse.getStatusCode();
        if (request.isForMainFrame() && status >= 500 && !isAlreadyShowingOfflinePage(view)) {
            view.loadUrl(OFFLINE_PAGE);
        }
    }

    private boolean isAlreadyShowingOfflinePage(WebView view) {
        String current = view.getUrl();
        return current != null && current.startsWith("file:///android_asset/offline_fallback.html");
    }
}
