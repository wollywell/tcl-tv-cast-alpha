import fs from 'node:fs/promises';
import { describe, expect, test } from 'vitest';

describe('package metadata', () => {
  test('defines Electron app and mac packaging commands', async () => {
    const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));

    expect(packageJson.main).toBe('apps/mac-desktop/main.js');
    expect(packageJson.scripts.app).toBe('electron apps/mac-desktop/main.js');
    expect(packageJson.scripts['build:receiver']).toBe('node scripts/build-receiver.js');
    expect(packageJson.scripts['install:adb']).toBe('node scripts/install-platform-tools.js');
    expect(packageJson.scripts['install:android-sdk']).toBe('node scripts/install-android-sdk.js');
    expect(packageJson.scripts['package:mac']).toBe('electron-builder --mac --dir');
    expect(packageJson.scripts['package:mac:zip']).toBe('electron-builder --mac zip');
    expect(packageJson.scripts['package:mac:dmg']).toBe('electron-builder --mac dmg');
    expect(packageJson.scripts['open:mac']).toContain('outputs/desktop/mac-arm64/TCL\\ TV\\ Cast.app');
    expect(packageJson.build).toEqual(expect.objectContaining({
      appId: 'dev.tclcast.sender',
      productName: 'TCL TV Cast',
      directories: { output: 'outputs/desktop' },
    }));
    expect(packageJson.build.files).toContain('!apps/android-tv-receiver/app/build/**/*');
    expect(packageJson.build.extraResources).toEqual([
      {
        from: 'apps/android-tv-receiver/app/build/outputs/apk/debug/app-debug.apk',
        to: 'receiver/app-debug.apk',
      },
    ]);
  });
});
