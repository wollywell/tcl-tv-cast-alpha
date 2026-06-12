import path from 'node:path';
import { app, BrowserWindow, desktopCapturer, session, shell } from 'electron';
import { createSenderServer } from '../mac-sender/src/server.js';

const preferredPort = Number(process.env.PORT ?? 4173);
let activePort = preferredPort;
let server;
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 960,
    minHeight: 680,
    title: 'TCL TV Cast',
    backgroundColor: '#101114',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.loadURL(`http://127.0.0.1:${activePort}`);
}

async function startServer() {
  const apkPath = app.isPackaged
    ? path.join(process.resourcesPath, 'receiver/app-debug.apk')
    : undefined;
  try {
    server = await startServerOnPort(preferredPort, apkPath);
  } catch (error) {
    if (error.code !== 'EADDRINUSE') {
      throw error;
    }
    console.warn(`Port ${preferredPort} is busy. Starting TCL TV Cast on a free port.`);
    server = await startServerOnPort(0, apkPath);
  }
  const address = server.httpServer.address();
  activePort = typeof address === 'object' && address ? address.port : preferredPort;
}

async function startServerOnPort(port, apkPath) {
  const candidate = createSenderServer({ port, apkPath });
  await new Promise((resolve, reject) => {
    const cleanup = () => {
      candidate.httpServer.off('error', onError);
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    candidate.httpServer.once('error', onError);
    candidate.start(() => {
      cleanup();
      resolve();
    });
  });
  return candidate;
}

function configureScreenCapture() {
  session.defaultSession.setDisplayMediaRequestHandler(
    async (_request, callback) => {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 320, height: 180 },
      });
      callback({ video: sources[0] });
    },
    { useSystemPicker: true },
  );
}

app.whenReady().then(async () => {
  configureScreenCapture();
  await startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  server?.io.close();
  server?.httpServer.close();
});
