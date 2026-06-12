import fs from 'node:fs/promises';
import { describe, expect, test } from 'vitest';

const mainActivityPath = 'apps/android-tv-receiver/app/src/main/java/com/tclcast/receiver/MainActivity.java';
const manifestPath = 'apps/android-tv-receiver/app/src/main/AndroidManifest.xml';
const networkSecurityPath = 'apps/android-tv-receiver/app/src/main/res/xml/network_security_config.xml';

describe('Android TV receiver activity', () => {
  test('persists the last serverUrl for launcher reuse', async () => {
    const source = await fs.readFile(mainActivityPath, 'utf8');

    expect(source).toContain('PREF_SERVER_URL');
    expect(source).toContain('preferences.edit().putString(PREF_SERVER_URL, normalizedUrl).apply();');
    expect(source).toContain('preferences.getString(PREF_SERVER_URL, null)');
  });

  test('adds the Android TV device name to the receiver URL', async () => {
    const source = await fs.readFile(mainActivityPath, 'utf8');

    expect(source).toContain('Build.MANUFACTURER');
    expect(source).toContain('Build.MODEL');
    expect(source).toContain('appendQueryParameter("name", receiverName)');
  });

  test('keeps the TV awake and immersive while receiving', async () => {
    const source = await fs.readFile(mainActivityPath, 'utf8');

    expect(source).toContain('WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON');
    expect(source).toContain('View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY');
    expect(source).toContain('View.SYSTEM_UI_FLAG_HIDE_NAVIGATION');
  });

  test('allows local HTTP sender URLs through network security config', async () => {
    const manifest = await fs.readFile(manifestPath, 'utf8');
    const networkSecurity = await fs.readFile(networkSecurityPath, 'utf8');

    expect(manifest).toContain('android:networkSecurityConfig="@xml/network_security_config"');
    expect(networkSecurity).toContain('cleartextTrafficPermitted="true"');
  });

  test('offers manual Mac receiver URL entry after sideload install', async () => {
    const source = await fs.readFile(mainActivityPath, 'utf8');

    expect(source).toContain('EditText urlInput');
    expect(source).toContain('TV Receiver URL');
    expect(source).toContain('normalizeManualServerUrl');
    expect(source).toContain('normalized = "http://" + normalized');
    expect(source).toContain('.path("/tv")');
    expect(source).toContain('.putString(PREF_SERVER_URL, normalizedUrl)');
    expect(source).toContain('showReceiver(withReceiverName(normalizedUrl))');
  });
});
