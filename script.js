// 1. CONECTAR COM O FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyBfZ_h3rVT_XyUWVErESOUaBU52M_S-JLI",
  authDomain: "projetofirabasechat.firebaseapp.com",
  projectId: "projetofirabasechat",
  storageBucket: "projetofirabasechat.firebasestorage.app",
  messagingSenderId: "153736799639",
  appId: "1:153736799639:web:035bbbcf5bd98c08b690d2"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

// Conecta aos serviços do Firebase
const auth = firebase.auth();
const db = firebase.firestore();

// 2. SELEÇÃO DOS ELEMENTOS DA DOM
const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');

const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authError = document.getElementById('auth-error');

const btnLogin = document.getElementById('login-btn');
const btnRegister = document.getElementById('register-btn');
const btnLogout = document.getElementById('logout-btn');

const userDisplay = document.getElementById('user-display');
const campoTexto = document.getElementById('message');
const btnEnviar = document.getElementById('send-btn');
const caixaMensagens = document.getElementById('chat-box');

// 3. OBSERVADOR DE ESTADO DE AUTENTICAÇÃO (CONTROLE DE ACESSO)
auth.onAuthStateChanged((user) => {
  if (user) {
    // Usuário está LOGADO: Exibe o chat e oculta o login
    authContainer.style.display = 'none';
    chatContainer.style.display = 'block';
    userDisplay.textContent = `Logado como: ${user.email}`;
    
    // Inicia a escuta de mensagens em tempo real
    carregarMensagens();
  } else {
    // Usuário NÃO está logado: Exibe o login e oculta o chat
    authContainer.style.display = 'block';
    chatContainer.style.display = 'none';
  }
});

// 4. FUNÇÕES DE AUTENTICAÇÃO
btnLogin.addEventListener('click', () => {
  const email = authEmail.value.trim();
  const senha = authPassword.value.trim();

  if (!email || !senha) {
    authError.textContent = "Preencha e-mail e senha.";
    return;
  }

  auth.signInWithEmailAndPassword(email, senha)
    .then(() => {
      authError.textContent = "";
      authEmail.value = "";
      authPassword.value = "";
    })
    .catch((error) => {
      authError.textContent = "Erro ao entrar: " + error.message;
    });
});

btnRegister.addEventListener('click', () => {
  const email = authEmail.value.trim();
  const senha = authPassword.value.trim();

  if (!email || !senha) {
    authError.textContent = "Preencha e-mail e senha para cadastrar.";
    return;
  }

  auth.createUserWithEmailAndPassword(email, senha)
    .then(() => {
      authError.textContent = "";
      alert("Conta criada com sucesso!");
    })
    .catch((error) => {
      authError.textContent = "Erro no cadastro: " + error.message;
    });
});

btnLogout.addEventListener('click', () => {
  auth.signOut();
});

// 5. ENVIAR MENSAGEM (USANDO O USUÁRIO LOGADO)
function enviarMensagem() {
  const user = auth.currentUser;
  const texto = campoTexto.value.trim();

  if (!user) {
    alert("Você precisa estar autenticado para enviar mensagens.");
    return;
  }

  if (texto === '') return;

  db.collection("mensagens").add({
    autor: user.email,
    texto: texto,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp()
  });

  campoTexto.value = '';
}

btnEnviar.addEventListener('click', enviarMensagem);

campoTexto.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    enviarMensagem();
  }
});

// 6. BUSCAR MENSAGENS EM TEMPO REAL
function carregarMensagens() {
  db.collection("mensagens")
    .orderBy("criadoEm", "asc")
    .onSnapshot((snapshot) => {
      caixaMensagens.innerHTML = '';

      snapshot.forEach((doc) => {
        const mensagem = doc.data();
        if (mensagem.autor && mensagem.texto) {
          const divMsg = document.createElement('div');
          divMsg.classList.add('msg');
          divMsg.innerHTML = `<span class="msg-user">${mensagem.autor}:</span> ${mensagem.texto}`;
          caixaMensagens.appendChild(divMsg);
        }
      });

      caixaMensagens.scrollTop = caixaMensagens.scrollHeight;
    });
}