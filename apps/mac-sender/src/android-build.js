import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { fileExists } from './adb.js';
import { runCommand } from './command.js';
import { getAndroidSdkBuildEnv } from './android-sdk.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');
export const receiverProjectDir = path.resolve(__dirname, '../../android-tv-receiver');
export const receiverGradlewPath = path.join(receiverProjectDir, 'gradlew');
export const receiverDebugApkPath = path.join(receiverProjectDir, 'app/build/outputs/apk/debug/app-debug.apk');
export const standaloneReceiverApkPath = path.join(rootDir, 'outputs/tcl-tv-cast-receiver-debug.apk');

export function getReceiverBuildCommand(projectDir = receiverProjectDir) {
  return {
    command: './gradlew',
    args: [':app:assembleDebug'],
    cwd: projectDir,
  };
}

export async function getBuildPrerequisites({ access } = {}) {
  return {
    gradlewExists: await fileExists(receiverGradlewPath, access),
    buildCommand: 'npm run build:receiver',
  };
}

export async function buildReceiverApk({ run = runCommand } = {}) {
  const [build, env] = await Promise.all([
    getReceiverBuildCommand(),
    getAndroidSdkBuildEnv(),
  ]);
  const output = await run({ ...build, env });
  await fs.mkdir(path.dirname(standaloneReceiverApkPath), { recursive: true });
  await fs.copyFile(receiverDebugApkPath, standaloneReceiverApkPath);
  return [{
    command: `${build.command} ${build.args.join(' ')}`,
    cwd: build.cwd,
    env: env.ANDROID_HOME ? `ANDROID_HOME=${env.ANDROID_HOME}` : undefined,
    output,
  }, {
    command: 'copy receiver APK',
    output: standaloneReceiverApkPath,
  }];
}

export async function ensureReceiverApk({ apkPath, access, build = buildReceiverApk } = {}) {
  if (await fileExists(apkPath, access)) {
    return [];
  }

  return build();
}
