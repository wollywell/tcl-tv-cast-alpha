import os from 'node:os';

export function listLocalIPv4(networkInterfaces = os.networkInterfaces()) {
  return Object.values(networkInterfaces)
    .flat()
    .filter(Boolean)
    .filter((entry) => entry.family === 'IPv4' && !entry.internal)
    .map((entry) => entry.address);
}

export function chooseInstallHost(networkInterfaces = os.networkInterfaces()) {
  const addresses = listLocalIPv4(networkInterfaces);
  return addresses[0] ?? '127.0.0.1';
}

export function makeServerUrl({ host, port, path = '' }) {
  const normalizedPath = path.startsWith('/') || path === '' ? path : `/${path}`;
  return `http://${host}:${port}${normalizedPath}`;
}

