import { describe, expect, test } from 'vitest';
import { formatDoctorStatus } from '../../../scripts/doctor.js';

describe('doctor CLI output', () => {
  test('formats setup status into actionable lines', () => {
    const output = formatDoctorStatus({
      adbUsable: false,
      adbFromPath: false,
      preferredAdbPath: null,
      sdkPath: null,
      receiverBuildSdkPath: null,
      localSdkManagerExists: false,
      localAndroidSdkDir: '/project/.tools/android-sdk',
      androidSdkInstallCommand: 'npm run install:android-sdk -- --accept-android-sdk-license',
      sdkAdbExists: false,
      sdkAdbPath: null,
      localAdbExists: false,
      localAdbPath: '/project/.tools/platform-tools/adb',
      platformToolsInstallCommand: 'npm run install:adb -- --accept-android-sdk-license',
      apkExists: false,
      apkPath: '/project/app-debug.apk',
      gradlewExists: true,
      buildCommand: 'npm run build:receiver',
      installHint: 'Install Android Studio or Android command line tools, then install platform-tools.',
    });

    expect(output).toContain('TCL TV Cast setup doctor');
    expect(output).toContain('ADB usable: no');
    expect(output).toContain('Receiver build SDK: not ready');
    expect(output).toContain('Project Android SDK: not found');
    expect(output).toContain('Install Android SDK: npm run install:android-sdk -- --accept-android-sdk-license');
    expect(output).toContain('Project platform-tools adb: not found');
    expect(output).toContain('Install ADB tools: npm run install:adb -- --accept-android-sdk-license');
    expect(output).toContain('Build wrapper: ready');
    expect(output).toContain('Build command: npm run build:receiver');
  });
});
