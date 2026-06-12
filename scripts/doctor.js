import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSetupStatus, runAdb } from '../apps/mac-sender/src/adb.js';
import { getBuildPrerequisites } from '../apps/mac-sender/src/android-build.js';
import { getAndroidToolStatus } from '../apps/mac-sender/src/setup-doctor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const apkPath = path.join(
  rootDir,
  'apps/android-tv-receiver/app/build/outputs/apk/debug/app-debug.apk',
);

export async function collectDoctorStatus() {
  const [setup, build, tools] = await Promise.all([
    getSetupStatus({ apkPath }),
    getBuildPrerequisites(),
    getAndroidToolStatus({ runAdbVersion: () => runAdb(['version']) }),
  ]);

  return {
    ...setup,
    ...build,
    ...tools,
  };
}

export function formatDoctorStatus(status) {
  return [
    'TCL TV Cast setup doctor',
    `ADB usable: ${status.adbUsable ? 'yes' : 'no'}`,
    `ADB from PATH: ${status.adbFromPath ? 'yes' : 'no'}`,
    `Selected ADB: ${status.preferredAdbPath ?? 'none'}`,
    `Android SDK: ${status.sdkPath ?? 'not found'}`,
    `Receiver build SDK: ${status.receiverBuildSdkPath ?? 'not ready'}`,
    `Project Android SDK: ${status.localSdkManagerExists ? status.localAndroidSdkDir : 'not found'}`,
    `Install Android SDK: ${status.androidSdkInstallCommand}`,
    `SDK platform-tools adb: ${status.sdkAdbExists ? status.sdkAdbPath : 'not found'}`,
    `Project platform-tools adb: ${status.localAdbExists ? status.localAdbPath : 'not found'}`,
    `Install ADB tools: ${status.platformToolsInstallCommand}`,
    `Receiver APK: ${status.apkExists ? 'ready' : 'missing'}`,
    `APK path: ${status.apkPath}`,
    `Build wrapper: ${status.gradlewExists ? 'ready' : 'missing'}`,
    `Build command: ${status.buildCommand}`,
    `Hint: ${status.installHint}`,
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const status = await collectDoctorStatus();
  console.log(formatDoctorStatus(status));
}
