import fs from 'node:fs/promises';
import { describe, expect, test } from 'vitest';

const senderPath = 'apps/mac-sender/public/sender.js';

describe('sender UI persistence', () => {
  test('persists the last TV and Mac setup fields in localStorage', async () => {
    const source = await fs.readFile(senderPath, 'utf8');

    expect(source).toContain("tvHost: 'tclCast.tvHost'");
    expect(source).toContain("macHost: 'tclCast.macHost'");
    expect(source).toContain("pairTarget: 'tclCast.pairTarget'");
    expect(source).toContain('function saveSetupFields()');
    expect(source).toContain('function restoreSetupFields()');
  });

  test('can load connected ADB devices into the candidate list', async () => {
    const source = await fs.readFile(senderPath, 'utf8');

    expect(source).toContain("fetch('/api/adb-devices')");
    expect(source).toContain('function renderAdbDevices(devices)');
    expect(source).toContain('Selected connected ADB target');
  });

  test('can install project-local ADB tools from the setup panel', async () => {
    const html = await fs.readFile('apps/mac-sender/public/index.html', 'utf8');
    const source = await fs.readFile(senderPath, 'utf8');

    expect(html).toContain('id="adbToolsButton"');
    expect(html).toContain('Install ADB tools');
    expect(source).toContain("endpoint: '/api/install-adb-tools'");
    expect(source).toContain('async function installAdbTools');
    expect(source).toContain('Download Android SDK Platform Tools from Google');
    expect(source).toContain('Installing Android Platform Tools locally');
  });

  test('can install project-local Android SDK build tools from the setup panel', async () => {
    const html = await fs.readFile('apps/mac-sender/public/index.html', 'utf8');
    const source = await fs.readFile(senderPath, 'utf8');

    expect(html).toContain('id="androidSdkButton"');
    expect(html).toContain('Install Android SDK');
    expect(source).toContain("endpoint: '/api/install-android-sdk'");
    expect(source).toContain('async function installAndroidSdk');
    expect(source).toContain('Download Android SDK command-line tools and build packages from Google');
    expect(source).toContain('Installing Android SDK command-line tools and build packages locally');
    expect(source).toContain('receiverBuildSdkAvailable');
  });

  test('runs missing setup tool preflight before receiver install', async () => {
    const source = await fs.readFile(senderPath, 'utf8');

    expect(source).toContain('function ensureInstallPrerequisites()');
    expect(source).toContain('const ready = await ensureInstallPrerequisites();');
    expect(source).toContain('ADB is missing. Download Android SDK Platform Tools from Google before installing the TV receiver?');
    expect(source).toContain('Android SDK build packages are missing. Download them from Google before building the TV receiver APK?');
    expect(source).toContain('installAdbTools({ skipConfirm: true, append: true })');
    expect(source).toContain('installAndroidSdk({ skipConfirm: true, append: true })');
  });

  test('offers a direct APK download for TV-side sideloading', async () => {
    const html = await fs.readFile('apps/mac-sender/public/index.html', 'utf8');
    const source = await fs.readFile(senderPath, 'utf8');

    expect(html).toContain('id="downloadApkLink"');
    expect(html).toContain('href="/receiver.apk"');
    expect(html).toContain('Download APK');
    expect(html).toContain('TV Receiver URL');
    expect(html).toContain('id="receiverUrlLink"');
    expect(html).toContain('Short TV APK URL');
    expect(html).toContain('id="shortApkUrlLink"');
    expect(html).toContain('href="/apk"');
    expect(html).toContain('id="apkUrlLink"');
    expect(source).toContain('function updateTvUrls');
    expect(source).toContain('status.receiverUrl');
    expect(source).toContain('status.apkUrl');
    expect(source).toContain('status.shortApkUrl');
    expect(source).toContain("makeLocalServerUrl(host, '/tv')");
    expect(source).toContain("makeLocalServerUrl(host, '/apk')");
    expect(source).toContain("makeLocalServerUrl(host, '/receiver.apk')");
  });

  test('refreshes connected ADB devices after successful pairing', async () => {
    const source = await fs.readFile(senderPath, 'utf8');

    expect(source).toContain('async function pairWirelessDebugging()');
    expect(source).toContain('await loadAdbDevices();');
  });

  test('auto-selects a single ready ADB device', async () => {
    const source = await fs.readFile(senderPath, 'utf8');

    expect(source).toContain('function selectAdbDevice(device');
    expect(source).toContain("device.state === 'device'");
    expect(source).toContain('if (readyDevices.length === 1)');
    expect(source).toContain('Auto-selected connected ADB target');
  });

  test('uses persisted stream quality controls for screen sharing', async () => {
    const html = await fs.readFile('apps/mac-sender/public/index.html', 'utf8');
    const source = await fs.readFile(senderPath, 'utf8');

    expect(html).toContain('id="resolutionSelect"');
    expect(html).toContain('id="frameRateSelect"');
    expect(source).toContain("resolution: 'tclCast.resolution'");
    expect(source).toContain("frameRate: 'tclCast.frameRate'");
    expect(source).toContain('function getVideoConstraints()');
    expect(source).toContain('video: getVideoConstraints()');
  });

  test('supports optional audio capture for screen sharing', async () => {
    const html = await fs.readFile('apps/mac-sender/public/index.html', 'utf8');
    const source = await fs.readFile(senderPath, 'utf8');

    expect(html).toContain('id="audioToggle"');
    expect(html).toContain('Include audio');
    expect(source).toContain("includeAudio: 'tclCast.includeAudio'");
    expect(source).toContain('function getAudioConstraints()');
    expect(source).toContain('audio: getAudioConstraints()');
  });

  test('monitors outbound WebRTC video bitrate while sharing', async () => {
    const source = await fs.readFile(senderPath, 'utf8');

    expect(source).toContain('function startStatsMonitor()');
    expect(source).toContain('peerConnection.getStats()');
    expect(source).toContain("report.type !== 'outbound-rtp'");
    expect(source).toContain('function formatBitrate(bitsPerSecond)');
    expect(source).toContain('function stopStatsMonitor()');
  });
});
