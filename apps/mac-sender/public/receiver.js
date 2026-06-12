const socket = io();
const video = document.querySelector('#screenVideo');
const status = document.querySelector('#receiverStatus');
const nameElement = document.querySelector('#receiverName');

const params = new URLSearchParams(window.location.search);
const receiverName = params.get('name') || 'TCL Google TV';
const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];

let peerConnection = null;
let currentSenderId = null;

nameElement.textContent = receiverName;

function setStatus(message) {
  status.textContent = message;
}

function createPeerConnection(senderId) {
  const connection = new RTCPeerConnection({ iceServers });
  connection.ontrack = (event) => {
    const [stream] = event.streams;
    video.srcObject = stream;
    document.body.classList.add('receiving');
    setStatus('Receiving Mac screen.');
  };
  connection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('signal', {
        targetId: senderId,
        data: { type: 'ice-candidate', candidate: event.candidate },
      });
    }
  };
  connection.onconnectionstatechange = () => {
    if (connection.connectionState === 'connected') {
      setStatus('Connected. Receiving Mac screen.');
      return;
    }
    if (connection.connectionState === 'failed') {
      stopReceiving('Connection failed. Waiting for Mac sender...');
      return;
    }
    if (connection.connectionState === 'disconnected') {
      setStatus('Connection interrupted. Waiting to recover...');
      document.body.classList.remove('receiving');
      return;
    }
    setStatus(`WebRTC: ${connection.connectionState}`);
  };
  connection.oniceconnectionstatechange = () => {
    if (connection.iceConnectionState === 'checking') {
      setStatus('Connecting to Mac...');
    }
    if (connection.iceConnectionState === 'failed') {
      stopReceiving('Network connection failed. Waiting for Mac sender...');
    }
  };
  return connection;
}

function stopReceiving(message = 'Waiting for Mac sender...', options = {}) {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  if (!options.keepSender) {
    currentSenderId = null;
  }
  if (video.srcObject) {
    for (const track of video.srcObject.getTracks()) {
      track.stop();
    }
    video.srcObject = null;
  }
  document.body.classList.remove('receiving');
  setStatus(message);
}

socket.on('connect', () => {
  socket.emit('receiver:register', { name: receiverName });
  setStatus('Connected to Mac sender. Waiting for screen...');
});

socket.on('disconnect', () => {
  setStatus('Disconnected from Mac sender.');
});

socket.on('signal', async ({ fromId, data }) => {
  if (!data) {
    return;
  }

  if (data.type === 'offer') {
    currentSenderId = fromId;
    stopReceiving('Preparing new Mac screen...', { keepSender: true });
    peerConnection = createPeerConnection(fromId);
    await peerConnection.setRemoteDescription(data.description);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('signal', {
      targetId: fromId,
      data: { type: 'answer', description: peerConnection.localDescription },
    });
    setStatus('Answered Mac. Connecting...');
  }

  if (data.type === 'stop') {
    stopReceiving('Screen sharing stopped. Waiting for Mac sender...');
  }

  if (data.type === 'ice-candidate' && peerConnection && fromId === currentSenderId) {
    await peerConnection.addIceCandidate(data.candidate);
  }
});
