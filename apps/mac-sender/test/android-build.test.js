import { describe, expect, test } from 'vitest';
import {
  ensureReceiverApk,
  getBuildPrerequisites,
  getReceiverBuildCommand,
  receiverDebugApkPath,
  receiverProjectDir,
  standaloneReceiverApkPath,
} from '../src/android-build.js';

describe('Android receiver build helpers', () => {
  test('plans a Gradle wrapper debug APK build', () => {
    expect(getReceiverBuildCommand('/tmp/receiver')).toEqual({
      command: './gradlew',
      args: [':app:assembleDebug'],
      cwd: '/tmp/receiver',
    });
  });

  test('reports the wrapper build command as a setup prerequisite', async () => {
    const status = await getBuildPrerequisites({
      access: async () => undefined,
    });

    expect(status).toEqual({
      gradlewExists: true,
      buildCommand: 'npm run build:receiver',
    });
  });

  test('points at the Android TV receiver project', () => {
    expect(receiverProjectDir).toContain('apps/android-tv-receiver');
  });

  test('defines source and standalone receiver APK paths', () => {
    expect(receiverDebugApkPath).toContain('apps/android-tv-receiver/app/build/outputs/apk/debug/app-debug.apk');
    expect(standaloneReceiverApkPath).toContain('outputs/tcl-tv-cast-receiver-debug.apk');
  });

  test('does not build when the receiver APK already exists', async () => {
    const log = await ensureReceiverApk({
      apkPath: 'app-debug.apk',
      access: async () => undefined,
      build: async () => {
        throw new Error('should not build');
      },
    });

    expect(log).toEqual([]);
  });

  test('builds when the receiver APK is missing', async () => {
    const log = await ensureReceiverApk({
      apkPath: 'app-debug.apk',
      access: async () => {
        throw new Error('missing');
      },
      build: async () => [{ command: './gradlew :app:assembleDebug', output: 'built' }],
    });

    expect(log).toEqual([{ command: './gradlew :app:assembleDebug', output: 'built' }]);
  });
});
