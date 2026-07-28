// 1. CONFIGURAÇÃO DO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyBfZ_h3rVT_XyUWVErESOUaBU52M_S-JLI",
  authDomain: "projetofirabasechat.firebaseapp.com",
  projectId: "projetofirabasechat",
  storageBucket: "projetofirabasechat.firebasestorage.app",
  messagingSenderId: "153736799639",
  appId: "1:153736799639:web:035bbbcf5bd98c08b690d2"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Servidores STUN públicos para negociação WebRTC
const rtcConfig = {
  iceServers: [
    { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
  ],
  iceCandidatePoolSize: 10,
};

// Variáveis Globais
const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/847/847969.png";
let currentAvatarUrl = DEFAULT_AVATAR;
let selectedFile = null;
let unsubscribeMensagens = null;

// Variáveis da Chamada WebRTC
let peerConnection = null;
let localStream = null;
let remoteStream = null;

// 2. ELEMENTOS DA DOM
const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authError = document.getElementById('auth-error');
const btnLogin = document.getElementById('login-btn');
const btnRegister = document.getElementById('register-btn');
const btnLogout = document.getElementById('logout-btn');

const userDisplay = document.getElementById('user-display');
const userAvatarImg = document.getElementById('user-avatar-img');
const avatarInput = document.getElementById('avatar-input');

const campoTexto = document.getElementById('message');
const btnEnviar = document.getElementById('send-btn');
const caixaMensagens = document.getElementById('chat-box');

const emojiBtn = document.getElementById('emoji-btn');
const emojiPicker = document.getElementById('emoji-picker');
const fileInput = document.getElementById('file-input');
const filePreviewArea = document.getElementById('file-preview-area');
const fileNameDisplay = document.getElementById('file-name-display');
const cancelFileBtn = document.getElementById('cancel-file-btn');

// Elementos de Vídeo Chamada
const videoCallBtn = document.getElementById('video-call-btn');
const videoModal = document.getElementById('video-modal');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const createCallBtn = document.getElementById('create-call-btn');
const joinCallBtn = document.getElementById('join-call-btn');
const callIdInput = document.getElementById('call-id-input');
const toggleMicBtn = document.getElementById('toggle-mic-btn');
const toggleCamBtn = document.getElementById('toggle-cam-btn');
const endCallBtn = document.getElementById('end-call-btn');

// 3. MONITORAMENTO DE AUTENTICAÇÃO
auth.onAuthStateChanged((user) => {
  if (user) {
    authContainer.style.display = 'none';
    chatContainer.style.display = 'block';
    userDisplay.textContent = user.email;
    carregarPerfilUsuario(user.uid);
    carregarMensagensDoUsuario(user.uid);
  } else {
    authContainer.style.display = 'block';
    chatContainer.style.display = 'none';
    if (unsubscribeMensagens) unsubscribeMensagens();
  }
});

// 4. AUTENTICAÇÃO E PERFIL
btnLogin.addEventListener('click', () => {
  const email = authEmail.value.trim();
  const senha = authPassword.value.trim();
  if (!email || !senha) return (authError.textContent = "Preencha e-mail e senha.");

  auth.signInWithEmailAndPassword(email, senha).catch(err => authError.textContent = err.message);
});

btnRegister.addEventListener('click', () => {
  const email = authEmail.value.trim();
  const senha = authPassword.value.trim();
  if (!email || !senha) return (authError.textContent = "Preencha e-mail e senha.");

  auth.createUserWithEmailAndPassword(email, senha)
    .then(() => alert("Conta criada!"))
    .catch(err => authError.textContent = err.message);
});

btnLogout.addEventListener('click', () => auth.signOut());

avatarInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  const user = auth.currentUser;
  if (!file || !user) return;

  const ref = storage.ref(`avatars/${user.uid}`);
  ref.put(file).then(snapshot => snapshot.ref.getDownloadURL()).then(url => {
    currentAvatarUrl = url;
    userAvatarImg.src = url;
    db.collection("usuarios").doc(user.uid).set({ avatarUrl: url }, { merge: true });
  });
});

function carregarPerfilUsuario(userId) {
  db.collection("usuarios").doc(userId).get().then((doc) => {
    if (doc.exists && doc.data().avatarUrl) {
      currentAvatarUrl = doc.data().avatarUrl;
      userAvatarImg.src = currentAvatarUrl;
    }
  });
}

// 5. EMOJIS, ANEXOS E MENSAGENS
emojiBtn.addEventListener('click', () => {
  emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'grid' : 'none';
});

emojiPicker.querySelectorAll('span').forEach(el => {
  el.addEventListener('click', () => {
    campoTexto.value += el.textContent;
    emojiPicker.style.display = 'none';
  });
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) {
    selectedFile = e.target.files[0];
    fileNameDisplay.textContent = `📎 ${selectedFile.name}`;
    filePreviewArea.style.display = 'flex';
  }
});

cancelFileBtn.addEventListener('click', () => {
  selectedFile = null;
  fileInput.value = '';
  filePreviewArea.style.display = 'none';
});

async function enviarMensagem() {
  const user = auth.currentUser;
  const texto = campoTexto.value.trim();

  if (!user || (!texto && !selectedFile)) return;

  let fileUrl = null, fileName = null, fileType = null;

  if (selectedFile) {
    fileName = selectedFile.name;
    fileType = selectedFile.type.startsWith('image/') ? 'image' : 'file';
    const ref = storage.ref(`anexos/${user.uid}/${Date.now()}_${fileName}`);
    const snap = await ref.put(selectedFile);
    fileUrl = await snap.ref.getDownloadURL();
  }

  db.collection("mensagens").add({
    userId: user.uid,
    autor: user.email,
    avatarUrl: currentAvatarUrl,
    texto: texto,
    anexoUrl: fileUrl,
    anexoNome: fileName,
    anexoTipo: fileType,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp()
  });

  campoTexto.value = '';
  selectedFile = null;
  filePreviewArea.style.display = 'none';
}

btnEnviar.addEventListener('click', enviarMensagem);
campoTexto.addEventListener('keypress', (e) => { if (e.key === 'Enter') enviarMensagem(); });

function carregarMensagensDoUsuario(userId) {
  if (unsubscribeMensagens) unsubscribeMensagens();

  unsubscribeMensagens = db.collection("mensagens")
    .where("userId", "==", userId)
    .onSnapshot((snapshot) => {
      caixaMensagens.innerHTML = '';
      let mensagens = [];
      snapshot.forEach(doc => mensagens.push(doc.data()));

      mensagens.sort((a, b) => (a.criadoEm ? a.criadoEm.toMillis() : Date.now()) - (b.criadoEm ? b.criadoEm.toMillis() : Date.now()));

      mensagens.forEach(msg => {
        const div = document.createElement('div');
        div.classList.add('msg');
        let anexo = '';
        if (msg.anexoUrl) {
          anexo = msg.anexoTipo === 'image' 
            ? `<img src="${msg.anexoUrl}" class="msg-attachment-img" />`
            : `<a href="${msg.anexoUrl}" target="_blank" class="msg-attachment-file">📄 ${msg.anexoNome}</a>`;
        }

        div.innerHTML = `
          <img src="${msg.avatarUrl || DEFAULT_AVATAR}" class="msg-avatar">
          <div class="msg-body">
            <span class="msg-user">${msg.autor}</span>
            ${msg.texto ? `<span class="msg-text">${msg.texto}</span>` : ''}
            ${anexo}
          </div>
        `;
        caixaMensagens.appendChild(div);
      });
      caixaMensagens.scrollTop = caixaMensagens.scrollHeight;
    });
}

// 6. SISTEMA DE VÍDEO CHAMADA WEBRTC VIA FIRESTORE

// Abrir Modal e Ativar Câmera Local
videoCallBtn.addEventListener('click', async () => {
  videoModal.style.display = 'flex';
  await iniciarMediaLocal();
});

async function iniciarMediaLocal() {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  remoteStream = new MediaStream();

  localVideo.srcObject = localStream;
  remoteVideo.srcObject = remoteStream;
}

// CRIAR UMA CHAMADA (Pessoa A)
createCallBtn.addEventListener('click', async () => {
  peerConnection = new RTCPeerConnection(rtcConfig);

  // Adiciona a mídia local à conexão
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  // Ouve faixas do parceiro remoto
  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
  };

  const callDoc = db.collection('chamadas').doc();
  const offerCandidates = callDoc.collection('offerCandidates');
  const answerCandidates = callDoc.collection('answerCandidates');

  callIdInput.value = callDoc.id;

  // Salva ICE Candidates locais
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      offerCandidates.add(event.candidate.toJSON());
    }
  };

  // Cria a Oferta SDP
  const offerDescription = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offerDescription);

  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };

  await callDoc.set({ offer });

  // Notifica o usuário para enviar o ID
  enviarCodigoNoChat(callDoc.id);

  // Ouve a Resposta da chamada
  callDoc.onSnapshot((snapshot) => {
    const data = snapshot.data();
    if (!peerConnection.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      peerConnection.setRemoteDescription(answerDescription);
    }
  });

  // Ouve ICE Candidates do outro parceiro
  answerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        peerConnection.addIceCandidate(candidate);
      }
    });
  });
});

// ENTRAR EM UMA CHAMADA EXISTENTE (Pessoa B)
joinCallBtn.addEventListener('click', async () => {
  const callId = callIdInput.value.trim();
  if (!callId) return alert("Digite o código da chamada!");

  const callDoc = db.collection('chamadas').doc(callId);
  const answerCandidates = callDoc.collection('answerCandidates');
  const offerCandidates = callDoc.collection('offerCandidates');

  peerConnection = new RTCPeerConnection(rtcConfig);

  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      answerCandidates.add(event.candidate.toJSON());
    }
  };

  const callData = (await callDoc.get()).data();
  if (!callData) return alert("Chamada não encontrada!");

  const offerDescription = callData.offer;
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offerDescription));

  const answerDescription = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answerDescription);

  const answer = {
    type: answerDescription.type,
    sdp: answerDescription.sdp,
  };

  await callDoc.update({ answer });

  offerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        peerConnection.addIceCandidate(candidate);
      }
    });
  });
});

// Utilitário para enviar o ID da chamada no chat
function enviarCodigoNoChat(callId) {
  const user = auth.currentUser;
  if (!user) return;

  db.collection("mensagens").add({
    userId: user.uid,
    autor: user.email,
    avatarUrl: currentAvatarUrl,
    texto: `📞 Criei uma vídeo chamada! Use este código para entrar: ${callId}`,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// Botões de Mídia
toggleMicBtn.addEventListener('click', () => {
  if (localStream) {
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      toggleMicBtn.textContent = audioTrack.enabled ? "🎤 Mudar Mute" : "🎙️ Ativar Mic";
    }
  }
});

toggleCamBtn.addEventListener('click', () => {
  if (localStream) {
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      toggleCamBtn.textContent = videoTrack.enabled ? "📹 Desativar Câmera" : "📷 Ativar Câmera";
    }
  }
});

// Encerrar Chamada
endCallBtn.addEventListener('click', () => {
  if (localStream) localStream.getTracks().forEach(t => t.stop());
  if (peerConnection) peerConnection.close();

  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
  videoModal.style.display = 'none';
});