package com.tclcast.receiver;

import android.app.Activity;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final String EXTRA_SERVER_URL = "serverUrl";
    private static final String PREFS_NAME = "receiver";
    private static final String PREF_SERVER_URL = "serverUrl";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        keepScreenAwake();

        String serverUrl = resolveServerUrl();
        if (serverUrl == null || serverUrl.trim().isEmpty()) {
            showSetupScreen();
            return;
        }

        showReceiver(withReceiverName(serverUrl.trim()));
    }

    private String resolveServerUrl() {
        String serverUrl = getIntent().getStringExtra(EXTRA_SERVER_URL);
        SharedPreferences preferences = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);

        if (serverUrl != null && !serverUrl.trim().isEmpty()) {
            String normalizedUrl = serverUrl.trim();
            preferences.edit().putString(PREF_SERVER_URL, normalizedUrl).apply();
            return normalizedUrl;
        }

        return preferences.getString(PREF_SERVER_URL, null);
    }

    private String withReceiverName(String serverUrl) {
        Uri uri = Uri.parse(serverUrl);
        if (uri.getQueryParameter("name") != null) {
            return serverUrl;
        }

        String manufacturer = Build.MANUFACTURER == null ? "" : Build.MANUFACTURER.trim();
        String model = Build.MODEL == null ? "" : Build.MODEL.trim();
        String receiverName = (manufacturer + " " + model).trim();
        if (receiverName.isEmpty()) {
            receiverName = "Android TV";
        }

        return uri.buildUpon()
            .appendQueryParameter("name", receiverName)
            .build()
            .toString();
    }

    private void showReceiver(String serverUrl) {
        enterImmersiveMode();
        WebView webView = new WebView(this);
        webView.setLayoutParams(new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        webView.loadUrl(serverUrl);
        setContentView(webView);
    }

    private void keepScreenAwake() {
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    private void enterImmersiveMode() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );
    }

    private void showSetupScreen() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER);
        layout.setPadding(64, 64, 64, 64);
        layout.setBackgroundColor(0xFF08090C);
        layout.setLayoutParams(new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));

        TextView textView = new TextView(this);
        textView.setGravity(Gravity.CENTER);
        textView.setTextSize(26);
        textView.setTextColor(0xFFFFFFFF);
        textView.setText(
            "TCL TV Cast\n\n" +
            "Start the Mac sender, then enter the TV Receiver URL shown on the Mac."
        );

        EditText urlInput = new EditText(this);
        urlInput.setSingleLine(true);
        urlInput.setTextColor(0xFFFFFFFF);
        urlInput.setHintTextColor(0xFF9AA0A6);
        urlInput.setTextSize(22);
        urlInput.setHint("http://192.168.1.20:4173/tv");
        urlInput.setSelectAllOnFocus(true);
        urlInput.setMinWidth(720);

        Button connectButton = new Button(this);
        connectButton.setText("Connect");
        connectButton.setTextSize(22);
        connectButton.setOnClickListener(view -> {
            String normalizedUrl = normalizeManualServerUrl(urlInput.getText().toString());
            if (normalizedUrl.isEmpty()) {
                urlInput.setError("Enter the Mac TV Receiver URL.");
                return;
            }
            getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                .edit()
                .putString(PREF_SERVER_URL, normalizedUrl)
                .apply();
            showReceiver(withReceiverName(normalizedUrl));
        });

        layout.addView(textView);
        layout.addView(urlInput);
        layout.addView(connectButton);
        setContentView(layout);
        urlInput.requestFocus();
    }

    private String normalizeManualServerUrl(String value) {
        if (value == null) {
            return "";
        }

        String normalized = value.trim();
        if (normalized.isEmpty()) {
            return "";
        }
        if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
            normalized = "http://" + normalized;
        }

        Uri uri = Uri.parse(normalized);
        if (uri.getPath() == null || uri.getPath().isEmpty() || "/".equals(uri.getPath())) {
            normalized = uri.buildUpon().path("/tv").build().toString();
        }
        return normalized;
    }
}
