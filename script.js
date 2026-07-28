// 1. CONFIGURAÇÃO FIREBASE
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

// Servidores STUN para WebRTC
const rtcConfig = {
  iceServers: [{ urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }],
  iceCandidatePoolSize: 10,
};

const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/847/847969.png";
let currentAvatarUrl = DEFAULT_AVATAR;
let selectedFile = null;
let unsubscribeMensagens = null;
let targetEmail = "";

// WebRTC Globais
let peerConnection = null;
let localStream = null;
let remoteStream = null;

// ELEMENTOS DOM
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

const targetEmailInput = document.getElementById('target-email');
const setTargetBtn = document.getElementById('set-target-btn');

const campoTexto = document.getElementById('message');
const btnEnviar = document.getElementById('send-btn');
const caixaMensagens = document.getElementById('chat-box');

const emojiBtn = document.getElementById('emoji-btn');
const emojiPicker = document.getElementById('emoji-picker');
const fileInput = document.getElementById('file-input');
const filePreviewArea = document.getElementById('file-preview-area');
const fileNameDisplay = document.getElementById('file-name-display');
const cancelFileBtn = document.getElementById('cancel-file-btn');

// Elementos Vídeo
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

// MONITOR DE AUTENTICAÇÃO
auth.onAuthStateChanged((user) => {
  if (user) {
    authContainer.style.display = 'none';
    chatContainer.style.display = 'block';
    userDisplay.textContent = user.email;
    carregarPerfilUsuario(user.uid);
  } else {
    authContainer.style.display = 'block';
    chatContainer.style.display = 'none';
    if (unsubscribeMensagens) unsubscribeMensagens();
  }
});

// LOGIN / CADASTRO
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
    .then(() => alert("Conta criada com sucesso!"))
    .catch(err => authError.textContent = err.message);
});

btnLogout.addEventListener('click', () => auth.signOut());

// DEFINE O USUÁRIO COM QUEM VAI CONVERSAR
setTargetBtn.addEventListener('click', () => {
  const email = targetEmailInput.value.trim();
  if (!email) return alert("Digite o e-mail do contato!");
  if (email === auth.currentUser.email) return alert("Digite o e-mail de outro usuário!");

  targetEmail = email;
  alert(`Chat aberto com: ${targetEmail}`);
  carregarMensagens();
});

// ALTERAÇÃO DE AVATAR
avatarInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  const user = auth.currentUser;
  if (!file || !user) return;

  const ref = storage.ref(`avatars/${user.uid}`);
  ref.put(file).then(snap => snap.ref.getDownloadURL()).then(url => {
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

// EMOJIS E ANEXOS
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

// ENVIAR MENSAGEM
async function enviarMensagem() {
  const user = auth.currentUser;
  const texto = campoTexto.value.trim();

  if (!user) return alert("Você precisa estar logado!");
  if (!targetEmail) return alert("Defina o e-mail do contato antes de enviar!");
  if (!texto && !selectedFile) return;

  btnEnviar.disabled = true;

  let fileUrl = null, fileName = null, fileType = null;

  if (selectedFile) {
    fileName = selectedFile.name;
    fileType = selectedFile.type.startsWith('image/') ? 'image' : 'file';
    const ref = storage.ref(`anexos/${user.uid}/${Date.now()}_${fileName}`);
    const snap = await ref.put(selectedFile);
    fileUrl = await snap.ref.getDownloadURL();
  }

  // Grava a mensagem vinculando remetente e destinatário
  db.collection("mensagens").add({
    remetenteEmail: user.email,
    destinatarioEmail: targetEmail,
    autor: user.email,
    avatarUrl: currentAvatarUrl,
    texto: texto,
    anexoUrl: fileUrl,
    anexoNome: fileName,
    anexoTipo: fileType,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    campoTexto.value = '';
    selectedFile = null;
    filePreviewArea.style.display = 'none';
    btnEnviar.disabled = false;
  }).catch((err) => {
    alert("Erro ao enviar: " + err.message);
    btnEnviar.disabled = false;
  });
}

btnEnviar.addEventListener('click', enviarMensagem);
campoTexto.addEventListener('keypress', (e) => { if (e.key === 'Enter') enviarMensagem(); });

// CARREGAR MENSAGENS DA CONVERSA ESPECÍFICA
function carregarMensagens() {
  if (unsubscribeMensagens) unsubscribeMensagens();
  const myEmail = auth.currentUser.email;

  unsubscribeMensagens = db.collection("mensagens")
    .onSnapshot((snapshot) => {
      caixaMensagens.innerHTML = '';
      let mensagens = [];

      snapshot.forEach(doc => {
        const m = doc.data();
        // Filtra mensagens pertencentes ao par (Eu <-> Contato)
        if (
          (m.remetenteEmail === myEmail && m.destinatarioEmail === targetEmail) ||
          (m.remetenteEmail === targetEmail && m.destinatarioEmail === myEmail)
        ) {
          mensagens.push(m);
        }
      });

      // Ordena por data no cliente
      mensagens.sort((a, b) => (a.criadoEm ? a.criadoEm.toMillis() : Date.now()) - (b.criadoEm ? b.criadoEm.toMillis() : Date.now()));

      mensagens.forEach(msg => {
        const div = document.createElement('div');
        div.classList.add('msg');
        if (msg.remetenteEmail === myEmail) div.classList.add('msg-mine');

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

// 4. VÍDEO CHAMADA WEBRTC
videoCallBtn.addEventListener('click', async () => {
  videoModal.style.display = 'flex';
  await iniciarMediaLocal();
});

async function iniciarMediaLocal() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    remoteStream = new MediaStream();

    localVideo.srcObject = localStream;
    remoteVideo.srcObject = remoteStream;
  } catch (err) {
    alert("Erro ao acessar câmera/mic: " + err.message);
  }
}

createCallBtn.addEventListener('click', async () => {
  peerConnection = new RTCPeerConnection(rtcConfig);

  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  peerConnection.ontrack = event => event.streams[0].getTracks().forEach(t => remoteStream.addTrack(t));

  const callDoc = db.collection('chamadas').doc();
  const offerCandidates = callDoc.collection('offerCandidates');
  const answerCandidates = callDoc.collection('answerCandidates');

  callIdInput.value = callDoc.id;

  peerConnection.onicecandidate = event => {
    if (event.candidate) offerCandidates.add(event.candidate.toJSON());
  };

  const offerDescription = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offerDescription);

  await callDoc.set({ offer: { sdp: offerDescription.sdp, type: offerDescription.type } });

  // Envia código na conversa se houver contato configurado
  if (targetEmail) {
    db.collection("mensagens").add({
      remetenteEmail: auth.currentUser.email,
      destinatarioEmail: targetEmail,
      autor: auth.currentUser.email,
      avatarUrl: currentAvatarUrl,
      texto: `📹 Chamada iniciada! Código de acesso: ${callDoc.id}`,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  callDoc.onSnapshot(snapshot => {
    const data = snapshot.data();
    if (!peerConnection.currentRemoteDescription && data?.answer) {
      peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
  });

  answerCandidates.onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data()));
      }
    });
  });
});

joinCallBtn.addEventListener('click', async () => {
  const callId = callIdInput.value.trim();
  if (!callId) return alert("Digite o código da chamada!");

  const callDoc = db.collection('chamadas').doc(callId);
  const answerCandidates = callDoc.collection('answerCandidates');
  const offerCandidates = callDoc.collection('offerCandidates');

  peerConnection = new RTCPeerConnection(rtcConfig);

  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  peerConnection.ontrack = event => event.streams[0].getTracks().forEach(t => remoteStream.addTrack(t));

  peerConnection.onicecandidate = event => {
    if (event.candidate) answerCandidates.add(event.candidate.toJSON());
  };

  const callData = (await callDoc.get()).data();
  if (!callData) return alert("Chamada não encontrada!");

  await peerConnection.setRemoteDescription(new RTCSessionDescription(callData.offer));
  const answerDescription = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answerDescription);

  await callDoc.update({ answer: { type: answerDescription.type, sdp: answerDescription.sdp } });

  offerCandidates.onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data()));
      }
    });
  });
});

toggleMicBtn.addEventListener('click', () => {
  if (localStream) {
    const track = localStream.getAudioTracks()[0];
    if (track) track.enabled = !track.enabled;
  }
});

toggleCamBtn.addEventListener('click', () => {
  if (localStream) {
    const track = localStream.getVideoTracks()[0];
    if (track) track.enabled = !track.enabled;
  }
});

endCallBtn.addEventListener('click', () => {
  if (localStream) localStream.getTracks().forEach(t => t.stop());
  if (peerConnection) peerConnection.close();
  videoModal.style.display = 'none';
});