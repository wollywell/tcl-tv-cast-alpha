import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { io as createClient } from 'socket.io-client';
import { createSenderServer } from '../src/server.js';

describe('sender server', () => {
  let server;
  let baseUrl;
  const clients = [];

  beforeEach(async () => {
    server = createSenderServer({
      port: 0,
      installPlatformTools: async () => [{ command: 'install platform-tools', output: 'ADB ready' }],
      installAndroidSdk: async () => [{ command: 'install android-sdk', output: 'SDK ready' }],
    });
    await new Promise((resolve) => server.start(resolve));
    const address = server.httpServer.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    for (const client of clients.splice(0)) {
      client.disconnect();
    }
    server.io.close();
    await new Promise((resolve) => server.httpServer.close(resolve));
  });

  test('serves the TV receiver page at /tv', async () => {
    const response = await fetch(`${baseUrl}/tv`);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('TCL TV Cast Receiver');
  });

  test('can be created without listening immediately for desktop embedding', () => {
    const embedded = createSenderServer({ port: 0, apkPath: '/tmp/app-debug.apk' });

    expect(embedded).toEqual({
      app: expect.any(Function),
      httpServer: expect.any(Object),
      io: expect.any(Object),
      receivers: expect.any(Map),
      start: expect.any(Function),
    });

    embedded.io.close();
    embedded.httpServer.close();
  });

  test('uses an embedded APK path when provided by the desktop shell', async () => {
    const embedded = createSenderServer({ port: 0, apkPath: '/tmp/receiver/app-debug.apk' });
    await new Promise((resolve) => embedded.start(resolve));
    const address = embedded.httpServer.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/setup-status`);
    const body = await response.json();

    expect(body.apkPath).toBe('/tmp/receiver/app-debug.apk');

    embedded.io.close();
    await new Promise((resolve) => embedded.httpServer.close(resolve));
  });

  test('serves the receiver APK as a local download with a short TV alias', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tcl-cast-apk-'));
    const apkPath = path.join(tempDir, 'app-debug.apk');
    await fs.writeFile(apkPath, 'apk bytes');

    const embedded = createSenderServer({ port: 0, apkPath });
    await new Promise((resolve) => embedded.start(resolve));
    const address = embedded.httpServer.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/receiver.apk`);
    const shortResponse = await fetch(`http://127.0.0.1:${address.port}/apk`);
    const body = await response.text();
    const shortBody = await shortResponse.text();

    expect(response.status).toBe(200);
    expect(shortResponse.status).toBe(200);
    expect(response.headers.get('content-disposition')).toContain('tcl-tv-cast-receiver-debug.apk');
    expect(shortResponse.headers.get('content-disposition')).toContain('tcl-tv-cast-receiver-debug.apk');
    expect(body).toBe('apk bytes');
    expect(shortBody).toBe('apk bytes');

    embedded.io.close();
    await new Promise((resolve) => embedded.httpServer.close(resolve));
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('returns an actionable error when the receiver APK download is missing', async () => {
    const apkPath = path.join(os.tmpdir(), 'missing-tcl-cast-receiver.apk');
    const embedded = createSenderServer({ port: 0, apkPath });
    await new Promise((resolve) => embedded.start(resolve));
    const address = embedded.httpServer.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/receiver.apk`);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toContain('npm run build:receiver');

    embedded.io.close();
    await new Promise((resolve) => embedded.httpServer.close(resolve));
  });

  test('exposes an ADB discovery endpoint', async () => {
    const response = await fetch(`${baseUrl}/api/discover-adb`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ candidates: expect.any(Array) });
  });

  test('exposes combined TV discovery candidates', async () => {
    const response = await fetch(`${baseUrl}/api/discover-tvs`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ candidates: expect.any(Array) });
  });

  test('exposes direct receiver URLs in sender status', async () => {
    const response = await fetch(`${baseUrl}/api/status`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.port).not.toBe(0);
    expect(body.senderUrl).toContain(`:${body.port}`);
    expect(body.receiverUrl).toBe(`${body.senderUrl}/tv`);
    expect(body.apkUrl).toBe(`${body.senderUrl}/receiver.apk`);
    expect(body.shortApkUrl).toBe(`${body.senderUrl}/apk`);
  });

  test('exposes setup readiness for ADB and APK', async () => {
    const response = await fetch(`${baseUrl}/api/setup-status`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      adbAvailable: expect.any(Boolean),
      adbVersion: body.adbVersion === null ? null : expect.any(String),
      adbError: body.adbError === null ? null : expect.any(String),
      apkExists: expect.any(Boolean),
      apkPath: expect.stringContaining('apps/android-tv-receiver'),
      gradlewExists: expect.any(Boolean),
      buildCommand: 'npm run build:receiver',
      sdkPath: body.sdkPath === null ? null : expect.any(String),
      sdkAvailable: expect.any(Boolean),
      receiverBuildSdkPath: body.receiverBuildSdkPath === null ? null : expect.any(String),
      receiverBuildSdkAvailable: expect.any(Boolean),
      sdkAdbPath: body.sdkAdbPath === null ? null : expect.any(String),
      sdkAdbExists: expect.any(Boolean),
      localAndroidSdkDir: expect.stringContaining('.tools/android-sdk'),
      localSdkManagerPath: expect.stringContaining('.tools/android-sdk/cmdline-tools/latest/bin/sdkmanager'),
      localSdkManagerExists: expect.any(Boolean),
      localAndroidPlatformExists: expect.any(Boolean),
      localAndroidBuildToolsExists: expect.any(Boolean),
      androidSdkInstallCommand: 'npm run install:android-sdk -- --accept-android-sdk-license',
      localPlatformToolsDir: expect.stringContaining('.tools/platform-tools'),
      localAdbPath: expect.stringContaining('.tools/platform-tools/adb'),
      localAdbExists: expect.any(Boolean),
      platformToolsInstallCommand: 'npm run install:adb -- --accept-android-sdk-license',
      adbFromPath: expect.any(Boolean),
      adbUsable: expect.any(Boolean),
      preferredAdbPath: body.preferredAdbPath === null ? null : expect.any(String),
      installHint: expect.any(String),
    });
  });

  test('returns an actionable error when pairing input is missing', async () => {
    const response = await fetch(`${baseUrl}/api/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toContain('TV pairing target');
  });

  test('returns an actionable error when launch target is missing', async () => {
    const response = await fetch(`${baseUrl}/api/launch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('ADB install target');
  });

  test('exposes an adb devices endpoint with actionable errors', async () => {
    const response = await fetch(`${baseUrl}/api/adb-devices`);
    const body = await response.json();

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(body).toEqual({ devices: expect.any(Array) });
    } else {
      expect(body.error).toEqual(expect.any(String));
    }
  });

  test('exposes a local Platform Tools install endpoint', async () => {
    const response = await fetch(`${baseUrl}/api/install-adb-tools`, { method: 'POST' });
    const body = await response.json();

    expect([200, 500]).toContain(response.status);
    if (response.status === 200) {
      expect(body).toEqual({ ok: true, log: expect.any(Array) });
    } else {
      expect(body.error).toEqual(expect.any(String));
    }
  });

  test('exposes a local Android SDK install endpoint', async () => {
    const response = await fetch(`${baseUrl}/api/install-android-sdk`, { method: 'POST' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, log: [{ command: 'install android-sdk', output: 'SDK ready' }] });
  });

  test('broadcasts receiver registrations to sender clients', async () => {
    const sender = createClient(baseUrl);
    const receiver = createClient(baseUrl);
    clients.push(sender, receiver);

    const updatePromise = new Promise((resolve) => {
      sender.on('receivers:update', (payload) => {
        if (payload.some((item) => item.name === 'TCL Google TV Smoke')) {
          resolve(payload);
        }
      });
    });

    receiver.emit('receiver:register', { name: 'TCL Google TV Smoke' });
    const update = await updatePromise;

    expect(update).toEqual([
      expect.objectContaining({
        name: 'TCL Google TV Smoke',
      }),
    ]);
  });
});
