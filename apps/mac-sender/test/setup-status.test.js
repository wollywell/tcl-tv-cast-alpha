import { describe, expect, test } from 'vitest';
import { getSetupStatus } from '../src/adb.js';

describe('setup status', () => {
  test('reports ready when ADB is available and APK exists', async () => {
    const status = await getSetupStatus({
      apkPath: 'receiver.apk',
      access: async () => undefined,
      run: async () => 'Android Debug Bridge version 1.0.41\nVersion 36.0.0',
    });

    expect(status).toEqual({
      adbAvailable: true,
      adbVersion: 'Android Debug Bridge version 1.0.41',
      adbError: null,
      apkExists: true,
      apkPath: 'receiver.apk',
    });
  });

  test('reports missing prerequisites with actionable fields', async () => {
    const status = await getSetupStatus({
      apkPath: 'receiver.apk',
      access: async () => {
        throw new Error('missing file');
      },
      run: async () => {
        throw new Error('ADB not found. Install Android Platform Tools first.');
      },
    });

    expect(status).toEqual({
      adbAvailable: false,
      adbVersion: null,
      adbError: 'ADB not found. Install Android Platform Tools first.',
      apkExists: false,
      apkPath: 'receiver.apk',
    });
  });
});

