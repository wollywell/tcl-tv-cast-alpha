import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

export const RECEIVER_PACKAGE = 'com.tclcast.receiver';
export const RECEIVER_ACTIVITY = `${RECEIVER_PACKAGE}/.MainActivity`;

export function normalizeAdbTarget(host, port = 5555) {
  if (host.includes(':')) {
    return host;
  }
  return `${host}:${port}`;
}

export function buildInstallPlan({ host, port = 5555, apkPath, serverUrl }) {
  const target = normalizeAdbTarget(host, port);
  return [
    ['connect', target],
    ['install', '-r', apkPath],
    buildLaunchCommand({ serverUrl }),
  ];
}

export function buildLaunchCommand({ serverUrl }) {
  return [
    'shell',
    'am',
    'start',
    '-n',
    RECEIVER_ACTIVITY,
    '--es',
    'serverUrl',
    serverUrl,
  ];
}

export function buildPairCommand({ target, pairingCode }) {
  return ['pair', target, pairingCode];
}

export function parseAdbDevices(output) {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('List of devices'))
    .map((line) => {
      const [target, state, ...details] = line.split(/\s+/);
      return {
        target,
        state,
        details: details.join(' '),
      };
    })
    .filter((device) => device.target && device.state);
}

export async function assertApkExists(apkPath) {
  try {
    await fs.access(apkPath);
  } catch {
    throw new Error(
      `APK not found at ${apkPath}. Build apps/android-tv-receiver first.`,
    );
  }
}

export async function fileExists(filePath, access = fs.access) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function runAdb(args, options = {}) {
  const adbPath = options.adbPath ?? 'adb';

  return new Promise((resolve, reject) => {
    const child = spawn(adbPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(new Error('ADB not found. Install Android Platform Tools first.'));
        return;
      }
      reject(error);
    });
    child.on('close', (code) => {
      const output = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n');
      if (code === 0) {
        resolve(output || `adb ${args.join(' ')} completed`);
        return;
      }
      reject(new Error(output || `adb ${args.join(' ')} failed with ${code}`));
    });
  });
}

export async function getSetupStatus({ apkPath, adbPath, run = runAdb, access = fs.access }) {
  const apkExists = await fileExists(apkPath, access);
  let adbAvailable = false;
  let adbVersion = null;
  let adbError = null;

  try {
    const output = await run(['version'], { adbPath });
    adbAvailable = true;
    adbVersion = output.split('\n')[0] ?? output;
  } catch (error) {
    adbError = error.message;
  }

  return {
    adbAvailable,
    adbVersion,
    adbError,
    apkExists,
    apkPath,
  };
}

export async function installReceiver({ host, port, apkPath, serverUrl, adbPath }) {
  await assertApkExists(apkPath);
  const plan = buildInstallPlan({ host, port, apkPath, serverUrl });
  const log = [];

  for (const args of plan) {
    const output = await runAdb(args, { adbPath });
    log.push({ command: `adb ${args.join(' ')}`, output });
  }

  return log;
}

export async function launchReceiver({ host, port, serverUrl, adbPath }) {
  const target = normalizeAdbTarget(host, port);
  const plan = [
    ['connect', target],
    buildLaunchCommand({ serverUrl }),
  ];
  const log = [];

  for (const args of plan) {
    const output = await runAdb(args, { adbPath });
    log.push({ command: `adb ${args.join(' ')}`, output });
  }

  return log;
}

export async function pairReceiver({ target, pairingCode, adbPath }) {
  if (!target || typeof target !== 'string') {
    throw new Error('Enter the TV pairing target, for example 192.168.1.77:37123.');
  }
  if (!pairingCode || typeof pairingCode !== 'string') {
    throw new Error('Enter the pairing code shown on the TV.');
  }

  const args = buildPairCommand({
    target: target.trim(),
    pairingCode: pairingCode.trim(),
  });
  const output = await runAdb(args, { adbPath });
  return [{ command: `adb ${args.join(' ')}`, output }];
}

export async function listAdbDevices({ adbPath } = {}) {
  const output = await runAdb(['devices', '-l'], { adbPath });
  return parseAdbDevices(output);
}
