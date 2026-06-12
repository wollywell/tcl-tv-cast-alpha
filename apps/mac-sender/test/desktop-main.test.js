import fs from 'node:fs/promises';
import { describe, expect, test } from 'vitest';

const desktopMainPath = 'apps/mac-desktop/main.js';

describe('Electron desktop shell', () => {
  test('falls back to a free sender port when the preferred port is busy', async () => {
    const source = await fs.readFile(desktopMainPath, 'utf8');

    expect(source).toContain('const preferredPort = Number(process.env.PORT ?? 4173)');
    expect(source).toContain("error.code !== 'EADDRINUSE'");
    expect(source).toContain('startServerOnPort(0, apkPath)');
    expect(source).toContain('activePort');
    expect(source).toContain('mainWindow.loadURL(`http://127.0.0.1:${activePort}`)');
  });
});
