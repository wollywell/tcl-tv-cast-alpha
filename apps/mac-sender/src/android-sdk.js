import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fileExists } from './adb.js';
import { runCommand } from './command.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');

export const androidCommandLineToolsDownloadUrl = 'https://dl.google.com/android/repository/commandlinetools-mac-14742923_latest.zip';
export function resolveProjectToolsDir(baseRoot = rootDir, env = process.env, homeDir = os.homedir()) {
  if (env.TCL_CAST_TOOLS_DIR) {
    return env.TCL_CAST_TOOLS_DIR;
  }

  if (baseRoot.includes('.asar')) {
    return path.join(homeDir, 'Library/Application Support/TCL TV Cast/tools');
  }

  return path.join(baseRoot, '.tools');
}

export const projectToolsDir = resolveProjectToolsDir();
export const projectAndroidSdkDir = path.join(projectToolsDir, 'android-sdk');
export const projectSdkManagerPath = path.join(projectAndroidSdkDir, 'cmdline-tools/latest/bin/sdkmanager');
export const requiredAndroidPackages = [
  'platform-tools',
  'platforms;android-35',
  'build-tools;35.0.0',
];

export function getRequiredPackagePaths(sdkPath) {
  return {
    platformJarPath: path.join(sdkPath, 'platforms/android-35/android.jar'),
    buildToolsPath: path.join(sdkPath, 'build-tools/35.0.0/aapt'),
  };
}

export function candidateSdkPaths(env = process.env, homeDir = os.homedir()) {
  return [
    env.ANDROID_HOME,
    env.ANDROID_SDK_ROOT,
    path.join(homeDir, 'Library/Android/sdk'),
    projectAndroidSdkDir,
  ].filter(Boolean);
}

export async function findAndroidSdk({ env, homeDir, access } = {}) {
  const candidates = candidateSdkPaths(env, homeDir);

  for (const sdkPath of candidates) {
    if (await fileExists(sdkPath, access)) {
      return sdkPath;
    }
  }

  return null;
}

export async function sdkHasReceiverBuildPackages(sdkPath, access) {
  const { platformJarPath, buildToolsPath } = getRequiredPackagePaths(sdkPath);

  return await fileExists(platformJarPath, access) && await fileExists(buildToolsPath, access);
}

export async function findReceiverBuildSdk({ env, homeDir, access } = {}) {
  const candidates = candidateSdkPaths(env, homeDir);

  for (const sdkPath of candidates) {
    if (await fileExists(sdkPath, access) && await sdkHasReceiverBuildPackages(sdkPath, access)) {
      return sdkPath;
    }
  }

  return null;
}

export async function getAndroidSdkStatus({ access } = {}) {
  const { platformJarPath, buildToolsPath } = getRequiredPackagePaths(projectAndroidSdkDir);

  return {
    localAndroidSdkDir: projectAndroidSdkDir,
    localSdkManagerPath: projectSdkManagerPath,
    localSdkManagerExists: await fileExists(projectSdkManagerPath, access),
    localAndroidPlatformExists: await fileExists(platformJarPath, access),
    localAndroidBuildToolsExists: await fileExists(buildToolsPath, access),
    androidSdkInstallCommand: 'npm run install:android-sdk -- --accept-android-sdk-license',
  };
}

export async function getAndroidSdkBuildEnv({ env, homeDir, access } = {}) {
  const sdkPath = await findReceiverBuildSdk({ env, homeDir, access });
  if (!sdkPath) {
    return {};
  }

  return {
    ANDROID_HOME: sdkPath,
    ANDROID_SDK_ROOT: sdkPath,
  };
}

export function getAndroidCommandLineToolsUrl(platform = os.platform()) {
  if (platform !== 'darwin') {
    throw new Error('Automatic Android SDK install is currently supported only on macOS.');
  }

  return androidCommandLineToolsDownloadUrl;
}

export async function installAndroidSdk({
  access,
  fetchImpl = globalThis.fetch,
  run = runCommand,
  sdkDir = projectAndroidSdkDir,
  platform = os.platform(),
} = {}) {
  const sdkmanagerPath = path.join(sdkDir, 'cmdline-tools/latest/bin/sdkmanager');
  const platformJarPath = path.join(sdkDir, 'platforms/android-35/android.jar');
  const buildToolsPath = path.join(sdkDir, 'build-tools/35.0.0/aapt');

  if (
    await fileExists(sdkmanagerPath, access)
    && await fileExists(platformJarPath, access)
    && await fileExists(buildToolsPath, access)
  ) {
    return [{
      command: 'check local android-sdk',
      output: `Android SDK already installed at ${sdkDir}`,
    }];
  }

  if (!fetchImpl) {
    throw new Error('This Node.js runtime does not provide fetch. Install Android SDK command-line tools manually from Android Developers.');
  }

  const url = getAndroidCommandLineToolsUrl(platform);
  const downloadsDir = path.join(sdkDir, '..', 'downloads');
  const zipPath = path.join(downloadsDir, 'commandlinetools-mac-latest.zip');
  const unzipDir = path.join(downloadsDir, 'commandlinetools-mac');
  const cmdlineToolsDir = path.join(sdkDir, 'cmdline-tools');
  const latestDir = path.join(cmdlineToolsDir, 'latest');

  await fs.mkdir(downloadsDir, { recursive: true });
  await fs.mkdir(cmdlineToolsDir, { recursive: true });
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`Failed to download Android SDK command-line tools: HTTP ${response.status}`);
  }

  const archive = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(zipPath, archive);

  await fs.rm(unzipDir, { recursive: true, force: true });
  await fs.rm(latestDir, { recursive: true, force: true });
  const unzipOutput = await run({
    command: 'unzip',
    args: ['-oq', zipPath, '-d', unzipDir],
    cwd: rootDir,
  });
  await fs.rename(path.join(unzipDir, 'cmdline-tools'), latestDir);
  await fs.chmod(sdkmanagerPath, 0o755);

  const packageOutput = await run({
    command: sdkmanagerPath,
    args: [`--sdk_root=${sdkDir}`, ...requiredAndroidPackages],
    cwd: rootDir,
    env: {
      ANDROID_HOME: sdkDir,
      ANDROID_SDK_ROOT: sdkDir,
    },
    input: 'y\n'.repeat(80),
  });

  return [
    {
      command: `download ${url}`,
      output: `Saved ${archive.length} bytes to ${zipPath}`,
    },
    {
      command: `unzip -oq ${zipPath} -d ${unzipDir}`,
      output: unzipOutput,
    },
    {
      command: `${sdkmanagerPath} --sdk_root=${sdkDir} ${requiredAndroidPackages.join(' ')}`,
      output: packageOutput,
    },
    {
      command: `ANDROID_HOME=${sdkDir}`,
      output: `Android SDK ready at ${sdkDir}`,
    },
  ];
}
