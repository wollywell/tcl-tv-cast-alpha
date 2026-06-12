import { describe, expect, test } from 'vitest';
import {
  androidCommandLineToolsDownloadUrl,
  getAndroidCommandLineToolsUrl,
  getAndroidSdkBuildEnv,
  getAndroidSdkStatus,
  findReceiverBuildSdk,
  installAndroidSdk,
  requiredAndroidPackages,
  resolveProjectToolsDir,
} from '../src/android-sdk.js';

describe('project-local Android SDK', () => {
  test('reports local SDK components and install command', async () => {
    const status = await getAndroidSdkStatus({
      access: async () => undefined,
    });

    expect(status).toEqual({
      localAndroidSdkDir: expect.stringContaining('.tools/android-sdk'),
      localSdkManagerPath: expect.stringContaining('.tools/android-sdk/cmdline-tools/latest/bin/sdkmanager'),
      localSdkManagerExists: true,
      localAndroidPlatformExists: true,
      localAndroidBuildToolsExists: true,
      androidSdkInstallCommand: 'npm run install:android-sdk -- --accept-android-sdk-license',
    });
  });

  test('uses a writable Application Support tools directory from packaged asar', () => {
    expect(resolveProjectToolsDir(
      '/Applications/TCL TV Cast.app/Contents/Resources/app.asar',
      {},
      '/Users/example',
    )).toBe('/Users/example/Library/Application Support/TCL TV Cast/tools');
  });

  test('allows an explicit tools directory override', () => {
    expect(resolveProjectToolsDir('/app/app.asar', { TCL_CAST_TOOLS_DIR: '/tmp/tools' }, '/Users/example'))
      .toBe('/tmp/tools');
  });

  test('uses the official macOS command-line tools download URL', () => {
    expect(getAndroidCommandLineToolsUrl('darwin')).toBe(androidCommandLineToolsDownloadUrl);
    expect(androidCommandLineToolsDownloadUrl).toContain('dl.google.com/android/repository/commandlinetools-mac');
  });

  test('rejects automatic SDK install on non-macOS platforms', () => {
    expect(() => getAndroidCommandLineToolsUrl('linux')).toThrow('currently supported only on macOS');
  });

  test('declares the packages required to build the receiver APK', () => {
    expect(requiredAndroidPackages).toEqual([
      'platform-tools',
      'platforms;android-35',
      'build-tools;35.0.0',
    ]);
  });

  test('skips download when local SDK packages already exist', async () => {
    const log = await installAndroidSdk({
      access: async () => undefined,
      sdkDir: '/tmp/tcl-cast-sdk',
      fetchImpl: async () => {
        throw new Error('should not download');
      },
    });

    expect(log).toEqual([{
      command: 'check local android-sdk',
      output: 'Android SDK already installed at /tmp/tcl-cast-sdk',
    }]);
  });

  test('provides Gradle build environment when an SDK is available', async () => {
    const env = await getAndroidSdkBuildEnv({
      env: { ANDROID_HOME: '/android-sdk' },
      homeDir: '/Users/example',
      access: async (filePath) => {
        if (
          filePath !== '/android-sdk'
          && filePath !== '/android-sdk/platforms/android-35/android.jar'
          && filePath !== '/android-sdk/build-tools/35.0.0/aapt'
        ) {
          throw new Error('missing');
        }
      },
    });

    expect(env).toEqual({
      ANDROID_HOME: '/android-sdk',
      ANDROID_SDK_ROOT: '/android-sdk',
    });
  });

  test('skips incomplete SDK directories when choosing a build SDK', async () => {
    const sdkPath = await findReceiverBuildSdk({
      env: { ANDROID_HOME: '/incomplete-sdk', ANDROID_SDK_ROOT: '/ready-sdk' },
      homeDir: '/Users/example',
      access: async (filePath) => {
        if (
          filePath === '/incomplete-sdk'
          || filePath === '/ready-sdk'
          || filePath === '/ready-sdk/platforms/android-35/android.jar'
          || filePath === '/ready-sdk/build-tools/35.0.0/aapt'
        ) {
          return;
        }
        throw new Error('missing');
      },
    });

    expect(sdkPath).toBe('/ready-sdk');
  });

  test('omits Gradle SDK env when no SDK has receiver build packages', async () => {
    const env = await getAndroidSdkBuildEnv({
      env: { ANDROID_HOME: '/incomplete-sdk' },
      homeDir: '/Users/example',
      access: async (filePath) => {
        if (filePath === '/incomplete-sdk') {
          return;
        }
        throw new Error('missing');
      },
    });

    expect(env).toEqual({});
  });
});
