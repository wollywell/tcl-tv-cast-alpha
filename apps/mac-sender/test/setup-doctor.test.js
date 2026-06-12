import { describe, expect, test } from 'vitest';
import {
  candidateSdkPaths,
  findAndroidSdk,
  getAndroidToolStatus,
} from '../src/setup-doctor.js';

describe('setup doctor', () => {
  test('prefers explicit Android SDK environment variables before the macOS default', () => {
    expect(candidateSdkPaths(
      { ANDROID_HOME: '/opt/android', ANDROID_SDK_ROOT: '/other/android' },
      '/Users/example',
    )).toEqual(expect.arrayContaining([
      '/opt/android',
      '/other/android',
      '/Users/example/Library/Android/sdk',
      expect.stringContaining('.tools/android-sdk'),
    ]));
  });

  test('finds the first existing SDK candidate', async () => {
    const sdkPath = await findAndroidSdk({
      env: { ANDROID_HOME: '/missing', ANDROID_SDK_ROOT: '/present' },
      homeDir: '/Users/example',
      access: async (filePath) => {
        if (filePath !== '/present') {
          throw new Error('missing');
        }
      },
    });

    expect(sdkPath).toBe('/present');
  });

  test('reports SDK and platform-tools state separately from PATH adb', async () => {
    const status = await getAndroidToolStatus({
      env: { ANDROID_HOME: '/android-sdk' },
      homeDir: '/Users/example',
      access: async (filePath) => {
        if (filePath !== '/android-sdk' && filePath !== '/android-sdk/platform-tools/adb') {
          throw new Error('missing');
        }
      },
      runAdbVersion: async () => {
        throw new Error('ADB not found. Install Android Platform Tools first.');
      },
    });

    expect(status).toEqual({
      sdkPath: '/android-sdk',
      sdkAvailable: true,
      receiverBuildSdkPath: null,
      receiverBuildSdkAvailable: false,
      sdkAdbPath: '/android-sdk/platform-tools/adb',
      sdkAdbExists: true,
      localAndroidSdkDir: expect.stringContaining('.tools/android-sdk'),
      localSdkManagerPath: expect.stringContaining('.tools/android-sdk/cmdline-tools/latest/bin/sdkmanager'),
      localSdkManagerExists: false,
      localAndroidPlatformExists: false,
      localAndroidBuildToolsExists: false,
      androidSdkInstallCommand: 'npm run install:android-sdk -- --accept-android-sdk-license',
      localPlatformToolsDir: expect.stringContaining('.tools/platform-tools'),
      localAdbPath: expect.stringContaining('.tools/platform-tools/adb'),
      localAdbExists: false,
      platformToolsInstallCommand: 'npm run install:adb -- --accept-android-sdk-license',
      adbFromPath: false,
      adbUsable: true,
      preferredAdbPath: '/android-sdk/platform-tools/adb',
      adbVersion: null,
      adbError: 'ADB not found. Install Android Platform Tools first.',
      installHint: 'Add Android SDK platform-tools to PATH, or install Android Platform Tools.',
    });
  });

  test('prefers PATH adb when available', async () => {
    const status = await getAndroidToolStatus({
      env: { ANDROID_HOME: '/android-sdk' },
      homeDir: '/Users/example',
      access: async () => undefined,
      runAdbVersion: async () => 'Android Debug Bridge version 1.0.41',
    });

    expect(status).toEqual(expect.objectContaining({
      adbFromPath: true,
      adbUsable: true,
      preferredAdbPath: 'adb',
      adbVersion: 'Android Debug Bridge version 1.0.41',
    }));
  });

  test('uses project-local Platform Tools when SDK and PATH adb are missing', async () => {
    const status = await getAndroidToolStatus({
      env: {},
      homeDir: '/Users/example',
      access: async (filePath) => {
        if (!filePath.endsWith('.tools/platform-tools/adb')) {
          throw new Error('missing');
        }
      },
      runAdbVersion: async () => {
        throw new Error('ADB not found. Install Android Platform Tools first.');
      },
    });

    expect(status).toEqual(expect.objectContaining({
      sdkPath: null,
      sdkAvailable: false,
      receiverBuildSdkPath: null,
      receiverBuildSdkAvailable: false,
      sdkAdbPath: null,
      sdkAdbExists: false,
      localSdkManagerExists: false,
      localAdbExists: true,
      adbUsable: true,
      preferredAdbPath: expect.stringContaining('.tools/platform-tools/adb'),
      installHint: expect.stringContaining('Using project-local Platform Tools'),
    }));
  });
});
