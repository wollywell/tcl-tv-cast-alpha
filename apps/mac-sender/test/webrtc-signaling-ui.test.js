import fs from 'node:fs/promises';
import { describe, expect, test } from 'vitest';

describe('WebRTC stop signaling UI', () => {
  test('sender emits an explicit stop signal to the active receiver', async () => {
    const source = await fs.readFile('apps/mac-sender/public/sender.js', 'utf8');

    expect(source).toContain('let activeReceiverId = null');
    expect(source).toContain("data: { type: 'stop' }");
    expect(source).toContain('activeReceiverId = selectedReceiverId');
  });

  test('receiver clears video and overlay state on stop', async () => {
    const source = await fs.readFile('apps/mac-sender/public/receiver.js', 'utf8');

    expect(source).toContain('function stopReceiving(');
    expect(source).toContain("data.type === 'stop'");
    expect(source).toContain("document.body.classList.remove('receiving')");
    expect(source).toContain('video.srcObject = null');
  });

  test('receiver clears stale media before accepting a replacement offer', async () => {
    const source = await fs.readFile('apps/mac-sender/public/receiver.js', 'utf8');

    expect(source).toContain("stopReceiving('Preparing new Mac screen...', { keepSender: true })");
    expect(source).toContain('if (!options.keepSender)');
  });

  test('receiver shows clearer connection status and failures', async () => {
    const source = await fs.readFile('apps/mac-sender/public/receiver.js', 'utf8');

    expect(source).toContain('connection.oniceconnectionstatechange');
    expect(source).toContain('Connected. Receiving Mac screen.');
    expect(source).toContain('Connection failed. Waiting for Mac sender...');
    expect(source).toContain('Network connection failed. Waiting for Mac sender...');
  });
});
