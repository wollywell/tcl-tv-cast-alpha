import { describe, expect, test } from 'vitest';
import {
  buildSubnetHosts,
  discoverTvCandidates,
  normalizeMdnsService,
  scanAdbCandidates,
  subnet24FromAddress,
} from '../src/discovery.js';

describe('ADB discovery helpers', () => {
  test('extracts a /24 subnet from an IPv4 address', () => {
    expect(subnet24FromAddress('192.168.0.7')).toBe('192.168.0');
  });

  test('builds unique subnet hosts and skips local Mac addresses', () => {
    expect(buildSubnetHosts(['192.168.0.7', '192.168.0.12'], { start: 6, end: 8 })).toEqual([
      '192.168.0.6',
      '192.168.0.8',
    ]);
  });

  test('scans only hosts whose ADB port responds', async () => {
    const candidates = await scanAdbCandidates({
      hosts: ['192.168.0.10', '192.168.0.11', '192.168.0.12'],
      port: 5555,
      concurrency: 2,
      probe: async (host) => host === '192.168.0.11',
    });

    expect(candidates).toEqual([
      {
        host: '192.168.0.11',
        port: 5555,
        label: 'Android TV candidate (192.168.0.11:5555)',
      },
    ]);
  });

  test('normalizes Google Cast mDNS services into TV candidates', () => {
    expect(normalizeMdnsService({
      name: 'Living Room TCL',
      type: 'googlecast',
      port: 8009,
      addresses: ['fe80::1', '192.168.0.55'],
    })).toEqual({
      host: '192.168.0.55',
      port: 8009,
      name: 'Living Room TCL',
      type: 'googlecast',
      source: 'mdns',
      label: 'Living Room TCL (192.168.0.55)',
    });
  });

  test('merges mDNS and ADB candidates by host', async () => {
    const candidates = await discoverTvCandidates({
      adb: {
        hosts: ['192.168.0.55'],
        probe: async () => true,
      },
      mdns: {
        bonjour: { destroy() {} },
        browserFactory: () => {
          const handlers = {};
          queueMicrotask(() => {
            handlers.up?.({
              name: 'Living Room TCL',
              type: 'googlecast',
              port: 8009,
              addresses: ['192.168.0.55'],
            });
          });
          return {
            on(event, handler) {
              handlers[event] = handler;
            },
            stop() {},
          };
        },
        timeoutMs: 1,
      },
    });

    expect(candidates).toEqual([
      expect.objectContaining({
        host: '192.168.0.55',
        name: 'Living Room TCL',
        source: 'adb+mdns',
        label: 'Living Room TCL (192.168.0.55, ADB ready)',
      }),
    ]);
  });
});
