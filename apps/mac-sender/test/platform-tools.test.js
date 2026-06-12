import { describe, expect, test } from 'vitest';
import {
  getPlatformToolsStatus,
  getPlatformToolsUrl,
  installPlatformTools,
  platformToolsDownloadUrl,
} from '../src/platform-tools.js';

describe('project-local Android Platform Tools', () => {
  test('reports the local adb path and install command', async () => {
    const status = await getPlatformToolsStatus({
      access: async () => undefined,
    });

    expect(status).toEqual({
      localPlatformToolsDir: expect.stringContaining('.tools/platform-tools'),
      localAdbPath: expect.stringContaining('.tools/platform-tools/adb'),
      localAdbExists: true,
      platformToolsInstallCommand: 'npm run install:adb -- --accept-android-sdk-license',
    });
  });

  test('uses the official macOS Platform Tools download URL', () => {
    expect(getPlatformToolsUrl('darwin')).toBe(platformToolsDownloadUrl);
    expect(platformToolsDownloadUrl).toContain('dl.google.com/android/repository/platform-tools');
  });

  test('rejects automatic install on non-macOS platforms', () => {
    expect(() => getPlatformToolsUrl('linux')).toThrow('currently supported only on macOS');
  });

  test('skips download when local adb already exists', async () => {
    const log = await installPlatformTools({
      access: async () => undefined,
      toolsDir: '/tmp/tcl-cast-tools',
      fetchImpl: async () => {
        throw new Error('should not download');
      },
    });

    expect(log).toEqual([{
      command: 'check local platform-tools',
      output: 'ADB already installed at /tmp/tcl-cast-tools/platform-tools/adb',
    }]);
  });
});
