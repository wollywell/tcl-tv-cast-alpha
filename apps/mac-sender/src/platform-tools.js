import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fileExists } from './adb.js';
import { resolveProjectToolsDir } from './android-sdk.js';
import { runCommand } from './command.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');

export const platformToolsDownloadUrl = 'https://dl.google.com/android/repository/platform-tools-latest-darwin.zip';
export const projectToolsDir = resolveProjectToolsDir(rootDir);
export const projectPlatformToolsDir = path.join(projectToolsDir, 'platform-tools');
export const projectAdbPath = path.join(projectPlatformToolsDir, 'adb');

export async function getPlatformToolsStatus({ access } = {}) {
  return {
    localPlatformToolsDir: projectPlatformToolsDir,
    localAdbPath: projectAdbPath,
    localAdbExists: await fileExists(projectAdbPath, access),
    platformToolsInstallCommand: 'npm run install:adb -- --accept-android-sdk-license',
  };
}

export function getPlatformToolsUrl(platform = os.platform()) {
  if (platform !== 'darwin') {
    throw new Error('Automatic Platform Tools install is currently supported only on macOS.');
  }

  return platformToolsDownloadUrl;
}

export async function installPlatformTools({
  access,
  fetchImpl = globalThis.fetch,
  run = runCommand,
  toolsDir = projectToolsDir,
  platform = os.platform(),
} = {}) {
  const adbPath = path.join(toolsDir, 'platform-tools/adb');
  if (await fileExists(adbPath, access)) {
    return [{
      command: 'check local platform-tools',
      output: `ADB already installed at ${adbPath}`,
    }];
  }

  if (!fetchImpl) {
    throw new Error('This Node.js runtime does not provide fetch. Install Platform Tools manually from Android Developers.');
  }

  const url = getPlatformToolsUrl(platform);
  const downloadsDir = path.join(toolsDir, 'downloads');
  const zipPath = path.join(downloadsDir, 'platform-tools-latest-darwin.zip');

  await fs.mkdir(downloadsDir, { recursive: true });
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`Failed to download Android Platform Tools: HTTP ${response.status}`);
  }

  const archive = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(zipPath, archive);

  const unzipOutput = await run({
    command: 'unzip',
    args: ['-oq', zipPath, '-d', toolsDir],
    cwd: rootDir,
  });
  await fs.chmod(adbPath, 0o755);

  return [
    {
      command: `download ${url}`,
      output: `Saved ${archive.length} bytes to ${zipPath}`,
    },
    {
      command: `unzip -oq ${zipPath} -d ${toolsDir}`,
      output: unzipOutput,
    },
    {
      command: `chmod +x ${adbPath}`,
      output: `ADB ready at ${adbPath}`,
    },
  ];
}
