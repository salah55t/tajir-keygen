package com.tajirpro.keygen;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.annotation.NonNull;
import androidx.webkit.WebViewAssetLoader;

import java.security.MessageDigest;

/**
 * TajirPro Keygen (مولّد مفاتيح تاجر برو) — standalone key generator app.
 *
 * Hosts a single-page offline Arabic UI (assets/index.html) inside a WebView.
 * The DeviceBridge exposes the device fingerprint computed with the SAME salt
 * as the main TajirPro app (com.tajirpro.app), so codes generated here are
 * directly valid for TajirPro on the same device.
 */
public class MainActivity extends Activity {

    private static final String START_URL =
            "https://appassets.androidplatform.net/assets/index.html";

    /**
     * The salt uses the TajirPro app's package name on purpose, so the
     * fingerprint computed here matches what TajirPro (com.tajirpro.app)
     * would compute on the same device. The keygen's own package name
     * (com.tajirpro.keygen) is NOT used in the salt.
     */
    private static final String TARGET_PACKAGE = "com.tajirpro.app";

    private WebView webView;

    /** JS bridge: device identity (read-only, no printing/notifications needed). */
    private class DeviceBridge {

        /** Full 32-hex-char device id (SHA-256 of salted ANDROID_ID). */
        @JavascriptInterface
        public String getDeviceId() {
            return computeDeviceId();
        }

        /** Short 8-hex-char device fingerprint — embedded inside subscription codes. */
        @JavascriptInterface
        public String getDeviceFingerprint() {
            try {
                return computeDeviceId().substring(0, 8);
            } catch (Exception e) {
                return "00000000";
            }
        }

        @JavascriptInterface
        public String getTargetPackage() {
            return TARGET_PACKAGE;
        }

        @JavascriptInterface
        public String getAppVersion() {
            try {
                return getPackageManager()
                        .getPackageInfo(getPackageName(), 0).versionName;
            } catch (Exception e) {
                return "1.0.0";
            }
        }

        /** Open an external URL (used for help / GitHub releases). */
        @JavascriptInterface
        public void openUrl(String url) {
            try {
                if (url == null || url.isEmpty()) return;
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
            } catch (Exception ignored) {}
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#F2F5F4"));
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(false);
        settings.setDefaultTextEncodingName("utf-8");

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url != null && (url.startsWith("https://appassets.androidplatform.net/")
                        || url.startsWith("data:"))) {
                    return false;
                }
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                } catch (Exception e) { /* ignore */ }
                return true;
            }
        });

        webView.addJavascriptInterface(new DeviceBridge(), "TajirDeviceBridge");

        webView.loadUrl(START_URL);
    }

    /* ============================================================
       Device fingerprint — MUST match TajirPro's algorithm exactly
       ============================================================ */

    private String computeDeviceId() {
        try {
            String androidId = Settings.Secure.getString(
                    getContentResolver(), Settings.Secure.ANDROID_ID);
            if (androidId == null || androidId.isEmpty()) androidId = "unknown";
            String salted = "tajirpro::" + androidId + "::" + TARGET_PACKAGE;
            return sha256Hex(salted).substring(0, 32);
        } catch (Exception e) {
            return "fallback-" + Build.BOARD + "-" + Build.MODEL;
        }
    }

    private static String sha256Hex(String s) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(s.getBytes("UTF-8"));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                String h = Integer.toHexString(b & 0xFF);
                if (h.length() == 1) sb.append('0');
                sb.append(h);
            }
            return sb.toString();
        } catch (Exception e) {
            return "0000000000000000000000000000000000000000000000000000000000000000";
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
