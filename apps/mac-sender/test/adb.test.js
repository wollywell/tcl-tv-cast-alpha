import { describe, expect, test } from 'vitest';
import {
  RECEIVER_ACTIVITY,
  buildLaunchCommand,
  buildPairCommand,
  buildInstallPlan,
  normalizeAdbTarget,
  parseAdbDevices,
} from '../src/adb.js';

describe('adb helpers', () => {
  test('normalizes a bare TV IP to the default wireless ADB port', () => {
    expect(normalizeAdbTarget('192.168.1.77')).toBe('192.168.1.77:5555');
  });

  test('keeps an explicit ADB target port', () => {
    expect(normalizeAdbTarget('192.168.1.77:37099')).toBe('192.168.1.77:37099');
  });

  test('keeps a wireless debugging connect target exactly as entered', () => {
    expect(normalizeAdbTarget('192.168.1.77:37199')).toBe('192.168.1.77:37199');
  });

  test('builds install and launch commands for the TV receiver', () => {
    const plan = buildInstallPlan({
      host: '192.168.1.77',
      apkPath: 'receiver.apk',
      serverUrl: 'http://192.168.1.44:4173/tv',
    });

    expect(plan).toEqual([
      ['connect', '192.168.1.77:5555'],
      ['install', '-r', 'receiver.apk'],
      [
        'shell',
        'am',
        'start',
        '-n',
        RECEIVER_ACTIVITY,
        '--es',
        'serverUrl',
        'http://192.168.1.44:4173/tv',
      ],
    ]);
  });

  test('builds a wireless debugging pairing command', () => {
    expect(buildPairCommand({
      target: '192.168.1.77:37123',
      pairingCode: '123456',
    })).toEqual(['pair', '192.168.1.77:37123', '123456']);
  });

  test('builds a receiver launch command with the current server URL', () => {
    expect(buildLaunchCommand({
      serverUrl: 'http://192.168.1.44:4173/tv',
    })).toEqual([
      'shell',
      'am',
      'start',
      '-n',
      RECEIVER_ACTIVITY,
      '--es',
      'serverUrl',
      'http://192.168.1.44:4173/tv',
    ]);
  });

  test('parses adb devices output into selectable targets', () => {
    expect(parseAdbDevices(`List of devices attached
192.168.1.77:5555 device product:tcl model:TCL_TV transport_id:3
emulator-5554 offline transport_id:1
`)).toEqual([
      {
        target: '192.168.1.77:5555',
        state: 'device',
        details: 'product:tcl model:TCL_TV transport_id:3',
      },
      {
        target: 'emulator-5554',
        state: 'offline',
        details: 'transport_id:1',
      },
    ]);
  });
});
