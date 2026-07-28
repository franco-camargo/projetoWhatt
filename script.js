// 1. CONECTAR COM O FIREBASE
// Substitua o objeto abaixo com as chaves reais do seu Console do Firebase
// Your web app's Firebase configuration
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

// Conecta ao serviço Cloud Firestore
const db = firebase.firestore();

// 2. SELECIONA OS ELEMENTOS DA TELA
const campoNome = document.getElementById('username');
const campoTexto = document.getElementById('message');
const btnEnviar = document.getElementById('send-btn');
const caixaMensagens = document.getElementById('chat-box');

// 3. FUNÇÃO PARA ENVIAR MENSAGEM AO FIRESTORE
function enviarMensagem() {
  const nome = campoNome.value.trim();
  const texto = campoTexto.value.trim();

  if (nome === '' || texto === '') {
    alert('Por favor, preencha o nome e a mensagem!');
    return;
  }

  // Grava uma nova mensagem no Firestore com data e hora do servidor
  db.collection("mensagens").add({
    autor: nome,
    texto: texto,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp()
  });

  campoTexto.value = '';
}

// 4. EVENTOS DE DISPARO
btnEnviar.addEventListener('click', enviarMensagem);

campoTexto.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    enviarMensagem();
  }
});

// 5. RECEBER MENSAGENS EM TEMPO REAL NO FIRESTORE
db.collection("mensagens")
  .orderBy("criadoEm", "asc")
  .onSnapshot((snapshot) => {
    // Limpa o container para renderizar a lista atualizada
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

    // Rola automaticamente para o final da conversa
    caixaMensagens.scrollTop = caixaMensagens.scrollHeight;
  });