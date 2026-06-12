import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { fileExists, getSetupStatus, installReceiver, launchReceiver, listAdbDevices, pairReceiver, runAdb } from './adb.js';
import { buildReceiverApk, ensureReceiverApk, getBuildPrerequisites } from './android-build.js';
import { installAndroidSdk } from './android-sdk.js';
import { discoverTvCandidates, scanAdbCandidates } from './discovery.js';
import { chooseInstallHost, listLocalIPv4, makeServerUrl } from './network.js';
import { installPlatformTools } from './platform-tools.js';
import { getAndroidToolStatus } from './setup-doctor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');
const publicDir = path.resolve(__dirname, '../public');
const sourceApkPath = path.resolve(
  rootDir,
  'apps/android-tv-receiver/app/build/outputs/apk/debug/app-debug.apk',
);

export function createSenderServer(options = {}) {
  const port = Number(options.port ?? process.env.PORT ?? 4173);
  const defaultApkPath = options.apkPath ?? sourceApkPath;
  const installPlatformToolsFn = options.installPlatformTools ?? installPlatformTools;
  const installAndroidSdkFn = options.installAndroidSdk ?? installAndroidSdk;
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer);
  const receivers = new Map();

  app.use(express.json());
  app.use(express.static(publicDir));

  app.get('/', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.get('/tv', (_req, res) => {
    res.sendFile(path.join(publicDir, 'tv.html'));
  });

  async function sendReceiverApk(_req, res) {
    if (!await fileExists(defaultApkPath)) {
      res.status(404).json({
        error: `Receiver APK not found at ${defaultApkPath}. Build it first with npm run build:receiver.`,
      });
      return;
    }

    res.download(defaultApkPath, 'tcl-tv-cast-receiver-debug.apk');
  }

  app.get('/receiver.apk', sendReceiverApk);
  app.get('/apk', sendReceiverApk);

  app.get('/api/status', (_req, res) => {
    const host = chooseInstallHost();
    const activePort = getActivePort();
    res.json({
      port: activePort,
      host,
      addresses: listLocalIPv4(),
      senderUrl: makeServerUrl({ host, port: activePort }),
      receiverUrl: makeServerUrl({ host, port: activePort, path: '/tv' }),
      apkUrl: makeServerUrl({ host, port: activePort, path: '/receiver.apk' }),
      shortApkUrl: makeServerUrl({ host, port: activePort, path: '/apk' }),
    });
  });

  app.get('/api/setup-status', async (_req, res) => {
    const [status, build, tools] = await Promise.all([
      getSetupStatus({ apkPath: defaultApkPath }),
      getBuildPrerequisites(),
      getAndroidToolStatus({ runAdbVersion: () => runAdb(['version']) }),
    ]);
    res.json({ ...status, ...build, ...tools });
  });

  app.post('/api/build-receiver', async (_req, res) => {
    try {
      const log = await buildReceiverApk();
      res.json({ ok: true, log });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/install-adb-tools', async (_req, res) => {
    try {
      const log = await installPlatformToolsFn();
      res.json({ ok: true, log });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/install-android-sdk', async (_req, res) => {
    try {
      const log = await installAndroidSdkFn();
      res.json({ ok: true, log });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/discover-adb', async (req, res) => {
    try {
      const port = req.query.port ? Number(req.query.port) : 5555;
      const candidates = await scanAdbCandidates({ port });
      res.json({ candidates });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/discover-tvs', async (_req, res) => {
    try {
      const candidates = await discoverTvCandidates();
      res.json({ candidates });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/install', async (req, res) => {
    const { tvHost, tvPort, macHost, apkPath = defaultApkPath } = req.body ?? {};

    if (!tvHost || typeof tvHost !== 'string') {
      res.status(400).json({ error: 'Enter the TCL TV IP address first.' });
      return;
    }

    const serverHost = macHost || chooseInstallHost();
    const serverUrl = makeServerUrl({ host: serverHost, port: getActivePort(), path: '/tv' });

    try {
      const tools = await getAndroidToolStatus({ runAdbVersion: () => runAdb(['version']) });
      const buildLog = await ensureReceiverApk({ apkPath });
      const log = await installReceiver({
        host: tvHost.trim(),
        port: tvPort ? Number(tvPort) : undefined,
        apkPath,
        serverUrl,
        adbPath: tools.preferredAdbPath ?? undefined,
      });
      res.json({ ok: true, serverUrl, log: [...buildLog, ...log] });
    } catch (error) {
      res.status(500).json({ error: error.message, serverUrl });
    }
  });

  app.post('/api/launch', async (req, res) => {
    const { tvHost, tvPort, macHost } = req.body ?? {};

    if (!tvHost || typeof tvHost !== 'string') {
      res.status(400).json({ error: 'Enter the TCL TV ADB install target first.' });
      return;
    }

    const serverHost = macHost || chooseInstallHost();
    const serverUrl = makeServerUrl({ host: serverHost, port: getActivePort(), path: '/tv' });

    try {
      const tools = await getAndroidToolStatus({ runAdbVersion: () => runAdb(['version']) });
      const log = await launchReceiver({
        host: tvHost.trim(),
        port: tvPort ? Number(tvPort) : undefined,
        serverUrl,
        adbPath: tools.preferredAdbPath ?? undefined,
      });
      res.json({ ok: true, serverUrl, log });
    } catch (error) {
      res.status(500).json({ error: error.message, serverUrl });
    }
  });

  app.post('/api/pair', async (req, res) => {
    const { target, pairingCode } = req.body ?? {};

    try {
      const tools = await getAndroidToolStatus({ runAdbVersion: () => runAdb(['version']) });
      const log = await pairReceiver({
        target,
        pairingCode,
        adbPath: tools.preferredAdbPath ?? undefined,
      });
      res.json({ ok: true, log });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/adb-devices', async (_req, res) => {
    try {
      const tools = await getAndroidToolStatus({ runAdbVersion: () => runAdb(['version']) });
      const devices = await listAdbDevices({ adbPath: tools.preferredAdbPath ?? undefined });
      res.json({ devices });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  function emitReceivers() {
    io.emit('receivers:update', Array.from(receivers.values()));
  }

  function getActivePort() {
    const address = httpServer.address();
    return typeof address === 'object' && address ? address.port : port;
  }

  io.on('connection', (socket) => {
    socket.emit('receivers:update', Array.from(receivers.values()));

    socket.on('receiver:register', (payload = {}) => {
      const name = typeof payload.name === 'string' && payload.name.trim()
        ? payload.name.trim()
        : 'TCL Google TV';
      receivers.set(socket.id, {
        id: socket.id,
        name,
        connectedAt: Date.now(),
      });
      emitReceivers();
    });

    socket.on('signal', ({ targetId, data }) => {
      if (!targetId || !data) {
        return;
      }
      io.to(targetId).emit('signal', {
        fromId: socket.id,
        data,
      });
    });

    socket.on('disconnect', () => {
      if (receivers.delete(socket.id)) {
        emitReceivers();
      }
    });
  });

  return {
    app,
    httpServer,
    io,
    receivers,
    start(callback) {
      return httpServer.listen(port, '0.0.0.0', callback);
    }
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 4173);
  const { start } = createSenderServer({ port });
  start(() => {
    const host = chooseInstallHost();
    console.log(`TCL TV Cast sender running at ${makeServerUrl({ host, port })}`);
    console.log(`TV receiver page: ${makeServerUrl({ host, port, path: '/tv' })}`);
  });
}
