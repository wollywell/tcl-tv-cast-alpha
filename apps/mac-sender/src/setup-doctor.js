import path from 'node:path';
import { fileExists } from './adb.js';
import { candidateSdkPaths, findAndroidSdk, findReceiverBuildSdk, getAndroidSdkStatus } from './android-sdk.js';
import { getPlatformToolsStatus } from './platform-tools.js';

export { candidateSdkPaths, findAndroidSdk } from './android-sdk.js';

export async function getAndroidToolStatus({ env, homeDir, access, runAdbVersion } = {}) {
  const sdkPath = await findAndroidSdk({ env, homeDir, access });
  const receiverBuildSdkPath = await findReceiverBuildSdk({ env, homeDir, access });
  const sdkAdbPath = sdkPath ? path.join(sdkPath, 'platform-tools/adb') : null;
  const [sdkAdbExists, localTools, localSdk] = await Promise.all([
    sdkAdbPath ? fileExists(sdkAdbPath, access) : false,
    getPlatformToolsStatus({ access }),
    getAndroidSdkStatus({ access }),
  ]);
  let adbFromPath = false;
  let adbVersion = null;
  let adbError = null;

  try {
    const output = await runAdbVersion();
    adbFromPath = true;
    adbVersion = output.split('\n')[0] ?? output;
  } catch (error) {
    adbError = error.message;
  }

  return {
    sdkPath,
    sdkAvailable: Boolean(sdkPath),
    receiverBuildSdkPath,
    receiverBuildSdkAvailable: Boolean(receiverBuildSdkPath),
    sdkAdbPath,
    sdkAdbExists,
    localAndroidSdkDir: localSdk.localAndroidSdkDir,
    localSdkManagerPath: localSdk.localSdkManagerPath,
    localSdkManagerExists: localSdk.localSdkManagerExists,
    localAndroidPlatformExists: localSdk.localAndroidPlatformExists,
    localAndroidBuildToolsExists: localSdk.localAndroidBuildToolsExists,
    androidSdkInstallCommand: localSdk.androidSdkInstallCommand,
    localPlatformToolsDir: localTools.localPlatformToolsDir,
    localAdbPath: localTools.localAdbPath,
    localAdbExists: localTools.localAdbExists,
    platformToolsInstallCommand: localTools.platformToolsInstallCommand,
    adbFromPath,
    adbUsable: adbFromPath || sdkAdbExists || localTools.localAdbExists,
    preferredAdbPath: adbFromPath ? 'adb' : sdkAdbExists ? sdkAdbPath : localTools.localAdbExists ? localTools.localAdbPath : null,
    adbVersion,
    adbError,
    installHint: localTools.localAdbExists
      ? `Using project-local Platform Tools at ${localTools.localPlatformToolsDir}.`
      : sdkPath
      ? 'Add Android SDK platform-tools to PATH, or install Android Platform Tools.'
      : 'Click Install ADB tools, or install Android Studio / Android command line tools with platform-tools.',
  };
}
