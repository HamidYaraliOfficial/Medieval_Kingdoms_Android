// Copyright (c) 2026 Hamid Yarali. All Rights Reserved.
package com.hamidyarali.ironcrown;

import android.app.Activity;
import android.content.pm.ApplicationInfo;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ValueCallback;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;

/**
 * Hosts the game (HTML5 + WebGL, bundled in assets/www) in a full-screen WebView. The game is served from a virtual
 * https origin so it runs in a secure context without any network access: the app needs no permissions.
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/index.html";
    private static final String ASSET_DIR = "www";
    /** The game decides what "back" means (close a dialog, open the pause menu, ...) and answers "exit" only at the main menu. */
    private static final String BACK_SCRIPT = "(function(){try{var a=window.__ic;if(a&&a.back)return a.back();}catch(e){}return 'exit';})()";
    /** Lets the game pause and autosave when the app goes to the background. */
    private static final String SAVE_SCRIPT = "try{window.dispatchEvent(new Event('pagehide'));}catch(e){}";

    private WebView web;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideBars();
        web = new WebView(this);
        web.setBackgroundColor(getColor(R.color.page_bg));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        setContentView(web, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true); // saves and settings live in localStorage
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setTextZoom(100);
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) WebView.setWebContentsDebuggingEnabled(true);
        web.setWebViewClient(new AssetClient());
        web.loadUrl(START_URL);
    }

    private void hideBars() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideBars();
    }

    @Override
    public void onBackPressed() {
        if (web == null) { finish(); return; }
        web.evaluateJavascript(BACK_SCRIPT, new ValueCallback<String>() {
            @Override public void onReceiveValue(String v) {
                if (v == null || v.contains("exit") || v.equals("null")) finish();
            }
        });
    }

    @Override
    protected void onPause() {
        if (web != null) { web.evaluateJavascript(SAVE_SCRIPT, null); web.onPause(); }
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        hideBars();
        if (web != null) web.onResume();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            ViewGroup parent = (ViewGroup) web.getParent();
            if (parent != null) parent.removeView(web);
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    // ------------------------------------------------------------------ serving assets/www under https://appassets.androidplatform.net/
    private final class AssetClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri u = request.getUrl();
            if (!HOST.equals(u.getHost())) return response("text/plain", 403, "Forbidden", new byte[0]);
            String path = u.getPath();
            if (path == null || path.length() == 0 || path.equals("/")) path = "/index.html";
            if (path.contains("..")) return response("text/plain", 404, "Not Found", new byte[0]);
            try {
                InputStream in = getAssets().open(ASSET_DIR + path);
                return stream(mimeFor(path), in);
            } catch (IOException e) {
                return response("text/plain", 404, "Not Found", new byte[0]);
            }
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return !HOST.equals(request.getUrl().getHost()); // never navigate away from the game
        }
    }

    private static WebResourceResponse response(String mime, int code, String reason, byte[] body) {
        return new WebResourceResponse(mime, "utf-8", code, reason, new HashMap<String, String>(), new ByteArrayInputStream(body));
    }

    private static WebResourceResponse stream(String mime, InputStream in) {
        HashMap<String, String> h = new HashMap<String, String>();
        h.put("Cache-Control", "no-cache");
        return new WebResourceResponse(mime, isText(mime) ? "utf-8" : null, 200, "OK", h, in);
    }

    private static boolean isText(String mime) {
        return mime.startsWith("text/") || mime.equals("application/javascript") || mime.equals("application/json") || mime.equals("image/svg+xml");
    }

    private static String mimeFor(String path) {
        String p = path.toLowerCase(Locale.ROOT);
        if (p.endsWith(".html") || p.endsWith(".htm")) return "text/html";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".woff")) return "font/woff";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }
}
