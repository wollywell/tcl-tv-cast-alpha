const socket = io();
const receiverList = document.querySelector('#receiverList');
const startButton = document.querySelector('#startButton');
const stopButton = document.querySelector('#stopButton');
const refreshButton = document.querySelector('#refreshButton');
const shareStatus = document.querySelector('#shareStatus');
const resolutionSelect = document.querySelector('#resolutionSelect');
const frameRateSelect = document.querySelector('#frameRateSelect');
const audioToggle = document.querySelector('#audioToggle');
const serverAddress = document.querySelector('#serverAddress');
const tvHostInput = document.querySelector('#tvHostInput');
const macHostSelect = document.querySelector('#macHostSelect');
const scanButton = document.querySelector('#scanButton');
const adbDevicesButton = document.querySelector('#adbDevicesButton');
const setupRefreshButton = document.querySelector('#setupRefreshButton');
const adbToolsButton = document.querySelector('#adbToolsButton');
const androidSdkButton = document.querySelector('#androidSdkButton');
const buildButton = document.querySelector('#buildButton');
const setupStatus = document.querySelector('#setupStatus');
const receiverUrlLink = document.querySelector('#receiverUrlLink');
const shortApkUrlLink = document.querySelector('#shortApkUrlLink');
const apkUrlLink = document.querySelector('#apkUrlLink');
const candidateList = document.querySelector('#candidateList');
const pairTargetInput = document.querySelector('#pairTargetInput');
const pairCodeInput = document.querySelector('#pairCodeInput');
const pairButton = document.querySelector('#pairButton');
const installButton = document.querySelector('#installButton');
const launchButton = document.querySelector('#launchButton');
const installLog = document.querySelector('#installLog');

let receivers = [];
let selectedReceiverId = null;
let mediaStream = null;
let peerConnection = null;
let activeReceiverId = null;
let statsTimer = null;
let previousVideoStats = null;
let serverPort = null;

const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
const storageKeys = {
  tvHost: 'tclCast.tvHost',
  macHost: 'tclCast.macHost',
  pairTarget: 'tclCast.pairTarget',
  resolution: 'tclCast.resolution',
  frameRate: 'tclCast.frameRate',
  includeAudio: 'tclCast.includeAudio',
};

function setShareStatus(message) {
  shareStatus.textContent = message;
}

function saveSetupFields() {
  localStorage.setItem(storageKeys.tvHost, tvHostInput.value);
  localStorage.setItem(storageKeys.macHost, macHostSelect.value);
  localStorage.setItem(storageKeys.pairTarget, pairTargetInput.value);
  localStorage.setItem(storageKeys.resolution, resolutionSelect.value);
  localStorage.setItem(storageKeys.frameRate, frameRateSelect.value);
  localStorage.setItem(storageKeys.includeAudio, audioToggle.checked ? 'true' : 'false');
}

function restoreSetupFields() {
  tvHostInput.value = localStorage.getItem(storageKeys.tvHost) ?? '';
  pairTargetInput.value = localStorage.getItem(storageKeys.pairTarget) ?? '';
  resolutionSelect.value = localStorage.getItem(storageKeys.resolution) ?? resolutionSelect.value;
  frameRateSelect.value = localStorage.getItem(storageKeys.frameRate) ?? frameRateSelect.value;
  audioToggle.checked = localStorage.getItem(storageKeys.includeAudio) === 'true';
}

function getVideoConstraints() {
  const [width, height] = resolutionSelect.value.split('x').map(Number);
  const frameRate = Number(frameRateSelect.value);

  return {
    frameRate: { ideal: frameRate, max: frameRate },
    width: { ideal: width },
    height: { ideal: height },
  };
}

function getAudioConstraints() {
  return audioToggle.checked ? true : false;
}

function makeLocalServerUrl(host, path) {
  const portPart = serverPort ? `:${serverPort}` : '';
  return `${window.location.protocol}//${host}${portPart}${path}`;
}

function updateTvUrls({ receiverUrl, apkUrl, shortApkUrl } = {}) {
  const host = macHostSelect.value || window.location.hostname;
  const nextReceiverUrl = receiverUrl ?? makeLocalServerUrl(host, '/tv');
  const nextShortApkUrl = shortApkUrl ?? makeLocalServerUrl(host, '/apk');
  const nextApkUrl = apkUrl ?? makeLocalServerUrl(host, '/receiver.apk');
  receiverUrlLink.href = nextReceiverUrl;
  receiverUrlLink.textContent = nextReceiverUrl;
  shortApkUrlLink.href = nextShortApkUrl;
  shortApkUrlLink.textContent = nextShortApkUrl;
  apkUrlLink.href = nextApkUrl;
  apkUrlLink.textContent = nextApkUrl;
}

async function loadStatus() {
  const response = await fetch('/api/status');
  const status = await response.json();
  serverPort = status.port;
  serverAddress.textContent = status.senderUrl;
  macHostSelect.innerHTML = '';

  const hosts = status.addresses.length > 0 ? status.addresses : [status.host];
  for (const host of hosts) {
    const option = document.createElement('option');
    option.value = host;
    option.textContent = host;
    macHostSelect.append(option);
  }

  const savedMacHost = localStorage.getItem(storageKeys.macHost);
  if (savedMacHost && hosts.includes(savedMacHost)) {
    macHostSelect.value = savedMacHost;
  }

  updateTvUrls(
    macHostSelect.value === status.host
      ? { receiverUrl: status.receiverUrl, apkUrl: status.apkUrl, shortApkUrl: status.shortApkUrl }
      : undefined,
  );
}

function renderSetupStatus(status) {
  const adbText = status.adbAvailable
    ? `ADB ready: ${status.adbVersion}`
    : `ADB missing: ${status.adbError}`;
  const adbPathText = status.preferredAdbPath
    ? `Using ADB: ${status.preferredAdbPath}`
    : 'No usable ADB found';
  const apkText = status.apkExists
    ? 'Receiver APK ready'
    : `Receiver APK will be built before install: ${status.apkPath}`;
  const sdkText = status.sdkAvailable
    ? `Android SDK: ${status.sdkPath}${status.receiverBuildSdkAvailable ? '' : ' (receiver build packages missing)'}`
    : `Android SDK missing: ${status.androidSdkInstallCommand}`;
  const platformToolsText = status.sdkAdbExists
    ? `platform-tools: ${status.sdkAdbPath}`
    : status.localAdbExists
    ? `project ADB: ${status.localAdbPath}`
    : status.installHint;
  const buildText = status.gradlewExists
    ? `Build: ${status.buildCommand}`
    : 'Build wrapper missing';
  setupStatus.textContent = `${adbText} | ${adbPathText} | ${apkText} | ${sdkText} | ${platformToolsText} | ${buildText}`;
  setupStatus.className = status.adbUsable && (status.apkExists || (status.gradlewExists && status.receiverBuildSdkAvailable))
    ? 'setup-status ready'
    : 'setup-status warning';
}

async function loadSetupStatus() {
  setupStatus.textContent = 'Checking install readiness...';
  const response = await fetch('/api/setup-status');
  const status = await response.json();
  renderSetupStatus(status);
  return status;
}

function renderReceivers() {
  receiverList.innerHTML = '';
  receiverList.classList.toggle('empty', receivers.length === 0);

  if (receivers.length === 0) {
    receiverList.textContent = 'No TV receiver connected yet.';
    selectedReceiverId = null;
    startButton.disabled = true;
    return;
  }

  if (!receivers.some((receiver) => receiver.id === selectedReceiverId)) {
    selectedReceiverId = receivers[0].id;
  }

  for (const receiver of receivers) {
    const button = document.createElement('button');
    button.className = receiver.id === selectedReceiverId ? 'receiver selected' : 'receiver';
    button.type = 'button';
    button.innerHTML = `<span>${receiver.name}</span><small>${receiver.id.slice(0, 6)}</small>`;
    button.addEventListener('click', () => {
      selectedReceiverId = receiver.id;
      renderReceivers();
    });
    receiverList.append(button);
  }

  startButton.disabled = false;
}

function renderCandidates(candidates) {
  candidateList.innerHTML = '';
  candidateList.classList.toggle('empty', candidates.length === 0);

  if (candidates.length === 0) {
    candidateList.textContent = 'No Android TV ADB candidates found.';
    return;
  }

  for (const candidate of candidates) {
    const button = document.createElement('button');
    button.className = 'candidate';
    button.type = 'button';
    const detail = candidate.source?.includes('adb')
      ? `ADB ${candidate.port ?? 5555}`
      : 'Cast/mDNS';
    button.innerHTML = `<span>${candidate.label ?? candidate.host}</span><small>${detail}</small>`;
    button.addEventListener('click', () => {
      tvHostInput.value = candidate.host;
      if (candidate.source?.includes('adb')) {
        tvHostInput.value = candidate.port ? `${candidate.host}:${candidate.port}` : candidate.host;
        pairTargetInput.value = candidate.port ? `${candidate.host}:${candidate.port}` : '';
        saveSetupFields();
        installLog.textContent = `Selected ${candidate.host}. Click install when the TV allows ADB debugging.`;
        return;
      }

      pairTargetInput.value = '';
      saveSetupFields();
      installLog.textContent = `Selected ${candidate.host} from Google Cast discovery. Enable Wireless debugging on the TV, then enter the pairing IP:port shown by the TV.`;
    });
    candidateList.append(button);
  }
}

function renderAdbDevices(devices) {
  candidateList.innerHTML = '';
  candidateList.classList.toggle('empty', devices.length === 0);

  if (devices.length === 0) {
    candidateList.textContent = 'No ADB devices connected yet.';
    return;
  }

  for (const device of devices) {
    const button = document.createElement('button');
    button.className = 'candidate';
    button.type = 'button';
    button.innerHTML = `<span>${device.target}</span><small>${device.state}</small>`;
    button.addEventListener('click', () => selectAdbDevice(device));
    candidateList.append(button);
  }
}

function selectAdbDevice(device, reason = 'Selected connected ADB target') {
  tvHostInput.value = device.target;
  saveSetupFields();
  installLog.textContent = device.state === 'device'
    ? `${reason} ${device.target}.`
    : `Selected ${device.target}, but its ADB state is ${device.state}. Reconnect or approve debugging on the TV.`;
}

function createPeerConnection(targetId) {
  const connection = new RTCPeerConnection({ iceServers });
  connection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('signal', {
        targetId,
        data: { type: 'ice-candidate', candidate: event.candidate },
      });
    }
  };
  connection.onconnectionstatechange = () => {
    setShareStatus(`WebRTC: ${connection.connectionState}`);
  };
  return connection;
}

function stopStatsMonitor() {
  if (statsTimer) {
    clearInterval(statsTimer);
    statsTimer = null;
  }
  previousVideoStats = null;
}

function formatBitrate(bitsPerSecond) {
  if (!Number.isFinite(bitsPerSecond) || bitsPerSecond <= 0) {
    return '0 Mbps';
  }
  return `${(bitsPerSecond / 1_000_000).toFixed(2)} Mbps`;
}

function startStatsMonitor() {
  stopStatsMonitor();
  statsTimer = setInterval(async () => {
    if (!peerConnection) {
      stopStatsMonitor();
      return;
    }

    const stats = await peerConnection.getStats();
    for (const report of stats.values()) {
      if (report.type !== 'outbound-rtp' || report.kind !== 'video') {
        continue;
      }

      if (previousVideoStats) {
        const bytesDelta = report.bytesSent - previousVideoStats.bytesSent;
        const timeDeltaSeconds = (report.timestamp - previousVideoStats.timestamp) / 1000;
        const bitrate = timeDeltaSeconds > 0 ? (bytesDelta * 8) / timeDeltaSeconds : 0;
        setShareStatus(`WebRTC: ${peerConnection.connectionState} | Video: ${formatBitrate(bitrate)}`);
      }

      previousVideoStats = {
        bytesSent: report.bytesSent,
        timestamp: report.timestamp,
      };
    }
  }, 1500);
}

async function startSharing() {
  if (!selectedReceiverId) {
    setShareStatus('Choose a TV first.');
    return;
  }

  stopSharing();
  saveSetupFields();
  mediaStream = await navigator.mediaDevices.getDisplayMedia({
    video: getVideoConstraints(),
    audio: getAudioConstraints(),
  });

  peerConnection = createPeerConnection(selectedReceiverId);
  activeReceiverId = selectedReceiverId;
  for (const track of mediaStream.getTracks()) {
    peerConnection.addTrack(track, mediaStream);
    track.addEventListener('ended', stopSharing, { once: true });
  }

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  startStatsMonitor();
  socket.emit('signal', {
    targetId: selectedReceiverId,
    data: { type: 'offer', description: peerConnection.localDescription },
  });

  startButton.disabled = true;
  stopButton.disabled = false;
  setShareStatus('Screen offer sent. Waiting for TV...');
}

function stopSharing() {
  stopStatsMonitor();
  if (activeReceiverId) {
    socket.emit('signal', {
      targetId: activeReceiverId,
      data: { type: 'stop' },
    });
  }
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  if (mediaStream) {
    for (const track of mediaStream.getTracks()) {
      track.stop();
    }
    mediaStream = null;
  }
  activeReceiverId = null;
  startButton.disabled = receivers.length === 0;
  stopButton.disabled = true;
}

async function installReceiver() {
  saveSetupFields();
  installButton.disabled = true;
  installLog.textContent = 'Checking setup, preparing receiver APK, then installing...\n';
  const ready = await ensureInstallPrerequisites();
  if (!ready) {
    installButton.disabled = false;
    return;
  }

  const response = await fetch('/api/install', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tvHost: tvHostInput.value,
      macHost: macHostSelect.value,
    }),
  });
  const body = await response.json();

  if (!response.ok) {
    installLog.textContent += `\n${body.error}\nReceiver URL: ${body.serverUrl ?? 'unknown'}`;
    installButton.disabled = false;
    return;
  }

  installLog.textContent = body.log
    .map((entry) => `$ ${entry.command}\n${entry.output}`)
    .join('\n\n');
  installLog.textContent += `\n\nReceiver URL: ${body.serverUrl}`;
  installButton.disabled = false;
}

async function launchExistingReceiver() {
  saveSetupFields();
  launchButton.disabled = true;
  installLog.textContent = 'Launching installed receiver...\n';
  const response = await fetch('/api/launch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tvHost: tvHostInput.value,
      macHost: macHostSelect.value,
    }),
  });
  const body = await response.json();

  if (!response.ok) {
    installLog.textContent += `\n${body.error}\nReceiver URL: ${body.serverUrl ?? 'unknown'}`;
    launchButton.disabled = false;
    return;
  }

  installLog.textContent = body.log
    .map((entry) => `$ ${entry.command}\n${entry.output}`)
    .join('\n\n');
  installLog.textContent += `\n\nReceiver URL: ${body.serverUrl}`;
  launchButton.disabled = false;
}

async function pairWirelessDebugging() {
  saveSetupFields();
  pairButton.disabled = true;
  installLog.textContent = 'Pairing wireless debugging...\n';
  const response = await fetch('/api/pair', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      target: pairTargetInput.value,
      pairingCode: pairCodeInput.value,
    }),
  });
  const body = await response.json();

  if (!response.ok) {
    installLog.textContent += `\n${body.error}`;
    pairButton.disabled = false;
    return;
  }

  installLog.textContent = body.log
    .map((entry) => `$ ${entry.command}\n${entry.output}`)
    .join('\n\n');
  pairButton.disabled = false;
  await loadAdbDevices();
}

async function buildReceiver() {
  buildButton.disabled = true;
  installLog.textContent = 'Building Android TV receiver APK...\n';
  const response = await fetch('/api/build-receiver', { method: 'POST' });
  const body = await response.json();

  if (!response.ok) {
    installLog.textContent += `\n${body.error}`;
    buildButton.disabled = false;
    await loadSetupStatus();
    return;
  }

  installLog.textContent = body.log
    .map((entry) => `$ ${entry.command}\n${entry.output}`)
    .join('\n\n');
  buildButton.disabled = false;
  await loadSetupStatus();
}

async function runSetupAction({ endpoint, button, startMessage, append = false }) {
  button.disabled = true;
  if (append) {
    installLog.textContent += `\n${startMessage}\n`;
  } else {
    installLog.textContent = `${startMessage}\n`;
  }
  const response = await fetch(endpoint, { method: 'POST' });
  const body = await response.json();

  if (!response.ok) {
    installLog.textContent += `\n${body.error}`;
    button.disabled = false;
    await loadSetupStatus();
    return false;
  }

  installLog.textContent += body.log
    .map((entry) => `$ ${entry.command}\n${entry.output}`)
    .join('\n\n');
  button.disabled = false;
  await loadSetupStatus();
  return true;
}

async function installAdbTools({ skipConfirm = false, append = false } = {}) {
  if (!skipConfirm && !window.confirm('Download Android SDK Platform Tools from Google and use them under the Android SDK License?')) {
    return false;
  }

  return runSetupAction({
    endpoint: '/api/install-adb-tools',
    button: adbToolsButton,
    startMessage: 'Installing Android Platform Tools locally...',
    append,
  });
}

async function installAndroidSdk({ skipConfirm = false, append = false } = {}) {
  if (!skipConfirm && !window.confirm('Download Android SDK command-line tools and build packages from Google and use them under the Android SDK License?')) {
    return false;
  }

  return runSetupAction({
    endpoint: '/api/install-android-sdk',
    button: androidSdkButton,
    startMessage: 'Installing Android SDK command-line tools and build packages locally...',
    append,
  });
}

async function ensureInstallPrerequisites() {
  let status = await loadSetupStatus();

  if (!status.adbUsable) {
    const approved = window.confirm('ADB is missing. Download Android SDK Platform Tools from Google before installing the TV receiver?');
    if (!approved || !await installAdbTools({ skipConfirm: true, append: true })) {
      installLog.textContent += '\nInstall stopped before ADB tools were installed.';
      return false;
    }
    status = await loadSetupStatus();
  }

  if (!status.apkExists && !status.receiverBuildSdkAvailable) {
    const approved = window.confirm('Android SDK build packages are missing. Download them from Google before building the TV receiver APK?');
    if (!approved || !await installAndroidSdk({ skipConfirm: true, append: true })) {
      installLog.textContent += '\nInstall stopped before Android SDK build packages were installed.';
      return false;
    }
  }

  return true;
}

async function scanForAndroidTv() {
  scanButton.disabled = true;
  candidateList.classList.add('empty');
  candidateList.textContent = 'Scanning local Wi-Fi for Android TV / Google Cast devices...';
  const response = await fetch('/api/discover-tvs');
  const body = await response.json();

  if (!response.ok) {
    candidateList.textContent = body.error ?? 'Scan failed.';
    scanButton.disabled = false;
    return;
  }

  renderCandidates(body.candidates);
  scanButton.disabled = false;
}

async function loadAdbDevices() {
  adbDevicesButton.disabled = true;
  candidateList.classList.add('empty');
  candidateList.textContent = 'Loading connected ADB devices...';
  const response = await fetch('/api/adb-devices');
  const body = await response.json();

  if (!response.ok) {
    candidateList.textContent = body.error ?? 'Could not list ADB devices.';
    adbDevicesButton.disabled = false;
    return;
  }

  renderAdbDevices(body.devices);
  const readyDevices = body.devices.filter((device) => device.state === 'device');
  if (readyDevices.length === 1) {
    selectAdbDevice(readyDevices[0], 'Auto-selected connected ADB target');
  }
  adbDevicesButton.disabled = false;
}

socket.on('receivers:update', (nextReceivers) => {
  receivers = nextReceivers;
  renderReceivers();
});

socket.on('signal', async ({ data }) => {
  if (!peerConnection || !data) {
    return;
  }
  if (data.type === 'answer') {
    await peerConnection.setRemoteDescription(data.description);
    setShareStatus('Connected. Streaming screen to TV.');
  }
  if (data.type === 'ice-candidate') {
    await peerConnection.addIceCandidate(data.candidate);
  }
});

startButton.addEventListener('click', () => {
  startSharing().catch((error) => setShareStatus(error.message));
});
stopButton.addEventListener('click', stopSharing);
refreshButton.addEventListener('click', loadStatus);
tvHostInput.addEventListener('change', saveSetupFields);
macHostSelect.addEventListener('change', () => {
  saveSetupFields();
  updateTvUrls();
});
pairTargetInput.addEventListener('change', saveSetupFields);
resolutionSelect.addEventListener('change', saveSetupFields);
frameRateSelect.addEventListener('change', saveSetupFields);
audioToggle.addEventListener('change', saveSetupFields);
setupRefreshButton.addEventListener('click', () => {
  loadSetupStatus().catch((error) => {
    setupStatus.textContent = error.message;
    setupStatus.className = 'setup-status warning';
  });
});
scanButton.addEventListener('click', () => {
  scanForAndroidTv().catch((error) => {
    candidateList.textContent = error.message;
    scanButton.disabled = false;
  });
});
adbDevicesButton.addEventListener('click', () => {
  loadAdbDevices().catch((error) => {
    candidateList.textContent = error.message;
    adbDevicesButton.disabled = false;
  });
});
pairButton.addEventListener('click', () => {
  pairWirelessDebugging().catch((error) => {
    installLog.textContent += `\n${error.message}`;
    pairButton.disabled = false;
  });
});
buildButton.addEventListener('click', () => {
  buildReceiver().catch((error) => {
    installLog.textContent += `\n${error.message}`;
    buildButton.disabled = false;
  });
});
adbToolsButton.addEventListener('click', () => {
  installAdbTools().catch((error) => {
    installLog.textContent += `\n${error.message}`;
    adbToolsButton.disabled = false;
  });
});
androidSdkButton.addEventListener('click', () => {
  installAndroidSdk().catch((error) => {
    installLog.textContent += `\n${error.message}`;
    androidSdkButton.disabled = false;
  });
});
installButton.addEventListener('click', () => {
  installReceiver().catch((error) => {
    installLog.textContent += `\n${error.message}`;
    installButton.disabled = false;
  });
});
launchButton.addEventListener('click', () => {
  launchExistingReceiver().catch((error) => {
    installLog.textContent += `\n${error.message}`;
    launchButton.disabled = false;
  });
});

restoreSetupFields();
loadStatus().catch((error) => {
  serverAddress.textContent = error.message;
});
loadSetupStatus().catch((error) => {
  setupStatus.textContent = error.message;
  setupStatus.className = 'setup-status warning';
});
