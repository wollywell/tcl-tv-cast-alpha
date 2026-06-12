import { describe, expect, test } from 'vitest';
import { chooseInstallHost, listLocalIPv4, makeServerUrl } from '../src/network.js';

describe('network helpers', () => {
  test('lists only non-internal IPv4 addresses', () => {
    const interfaces = {
      lo0: [{ family: 'IPv4', internal: true, address: '127.0.0.1' }],
      en0: [{ family: 'IPv4', internal: false, address: '192.168.1.44' }],
      utun: [{ family: 'IPv6', internal: false, address: 'fe80::1' }],
    };

    expect(listLocalIPv4(interfaces)).toEqual(['192.168.1.44']);
  });

  test('chooses the first reachable local IPv4 address', () => {
    const interfaces = {
      en0: [{ family: 'IPv4', internal: false, address: '10.0.0.8' }],
      en1: [{ family: 'IPv4', internal: false, address: '192.168.50.12' }],
    };

    expect(chooseInstallHost(interfaces)).toBe('10.0.0.8');
  });

  test('falls back to localhost when no LAN address exists', () => {
    expect(chooseInstallHost({ lo0: [{ family: 'IPv4', internal: true, address: '127.0.0.1' }] })).toBe('127.0.0.1');
  });

  test('builds an HTTP server URL with normalized path', () => {
    expect(makeServerUrl({ host: '192.168.1.44', port: 4173, path: 'tv' })).toBe('http://192.168.1.44:4173/tv');
  });
});

