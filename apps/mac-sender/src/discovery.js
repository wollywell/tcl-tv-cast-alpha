import net from 'node:net';
import { Bonjour } from 'bonjour-service';
import { listLocalIPv4 } from './network.js';

export function subnet24FromAddress(address) {
  const parts = address.split('.');
  if (parts.length !== 4) {
    throw new Error(`Invalid IPv4 address: ${address}`);
  }
  return `${parts[0]}.${parts[1]}.${parts[2]}`;
}

export function buildSubnetHosts(addresses, options = {}) {
  const start = options.start ?? 1;
  const end = options.end ?? 254;
  const ownAddresses = new Set(addresses);
  const subnets = [...new Set(addresses.map(subnet24FromAddress))];
  const hosts = [];

  for (const subnet of subnets) {
    for (let suffix = start; suffix <= end; suffix += 1) {
      const host = `${subnet}.${suffix}`;
      if (!ownAddresses.has(host)) {
        hosts.push(host);
      }
    }
  }

  return hosts;
}

export function probeTcpPort(host, port, timeoutMs = 350) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    function finish(open) {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      resolve(open);
    }

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

export async function scanAdbCandidates(options = {}) {
  const addresses = options.addresses ?? listLocalIPv4();
  const port = options.port ?? 5555;
  const timeoutMs = options.timeoutMs ?? 350;
  const concurrency = options.concurrency ?? 48;
  const hosts = options.hosts ?? buildSubnetHosts(addresses, options);
  const probe = options.probe ?? probeTcpPort;
  const found = [];
  let cursor = 0;

  async function worker() {
    while (cursor < hosts.length) {
      const host = hosts[cursor];
      cursor += 1;
      if (await probe(host, port, timeoutMs)) {
        found.push({ host, port, label: `Android TV candidate (${host}:${port})` });
      }
    }
  }

  const workerCount = Math.min(concurrency, hosts.length);
  await Promise.all(Array.from({ length: workerCount }, worker));

  return found.sort((a, b) => a.host.localeCompare(b.host, undefined, { numeric: true }));
}

export function normalizeMdnsService(service) {
  const addresses = service.addresses ?? [];
  const ipv4 = addresses.find((address) => /^\d+\.\d+\.\d+\.\d+$/.test(address));
  const host = ipv4 ?? service.host ?? null;

  if (!host) {
    return null;
  }

  return {
    host,
    port: service.port ?? null,
    name: service.name ?? service.fqdn ?? 'Google Cast / Android TV',
    type: service.type ?? 'googlecast',
    source: 'mdns',
    label: `${service.name ?? 'Google Cast / Android TV'} (${host})`,
  };
}

export function scanMdnsCastCandidates(options = {}) {
  const timeoutMs = options.timeoutMs ?? 3000;
  const bonjour = options.bonjour ?? new Bonjour();
  const browserFactory = options.browserFactory ?? ((query) => bonjour.find(query));
  const services = new Map();

  return new Promise((resolve) => {
    const browser = browserFactory({ type: 'googlecast' });
    const timer = setTimeout(() => {
      browser.stop?.();
      bonjour.destroy?.();
      resolve(
        Array.from(services.values())
          .map(normalizeMdnsService)
          .filter(Boolean)
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    }, timeoutMs);

    browser.on('up', (service) => {
      services.set(service.fqdn ?? service.name ?? `${service.host}:${service.port}`, service);
    });
    browser.on('error', () => {
      clearTimeout(timer);
      browser.stop?.();
      bonjour.destroy?.();
      resolve([]);
    });
  });
}

export async function discoverTvCandidates(options = {}) {
  const [adb, mdns] = await Promise.all([
    scanAdbCandidates(options.adb ?? {}),
    scanMdnsCastCandidates(options.mdns ?? {}),
  ]);

  const keyed = new Map();
  for (const candidate of mdns) {
    keyed.set(candidate.host, candidate);
  }
  for (const candidate of adb) {
    const existing = keyed.get(candidate.host);
    keyed.set(candidate.host, {
      ...existing,
      ...candidate,
      source: existing ? 'adb+mdns' : 'adb',
      name: existing?.name ?? candidate.label,
      label: existing ? `${existing.name} (${candidate.host}, ADB ready)` : candidate.label,
    });
  }

  return Array.from(keyed.values()).sort((a, b) => a.label.localeCompare(b.label));
}
