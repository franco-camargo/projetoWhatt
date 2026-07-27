// 1. Importando o Firebase e o Banco de Dados (Firestore)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

// 2. Suas chaves de conexão
const firebaseConfig = {
  apiKey: "AIzaSyDqwfO8QmX1KZ4r04m-dLLksUVswLHGyyE",
  authDomain: "projetowhattfirebase.firebaseapp.com",
  projectId: "projetowhattfirebase",
  storageBucket: "projetowhattfirebase.firebasestorage.app",
  messagingSenderId: "423583007790",
  appId: "1:423583007790:web:fc80904d1fcda1588b0bbf"
};

// 3. Ligando o motor do Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const mensagensRef = collection(db, "mensagens");

// Pega os elementos da tela
const form = document.getElementById("form-mensagem");
const campoTexto = document.getElementById("texto-msg");
const caixaMensagens = document.getElementById("mensagens");

// ----------------------------------------------------
// PASSO A: ENVIAR MENSAGEM PARA O FIREBASE
// ----------------------------------------------------
form.addEventListener("submit", async (e) => {
  e.preventDefault(); // Impede a página de recarregar
  
  const texto = campoTexto.value;
  campoTexto.value = ""; // Limpa o campo digitado

  // Salva no banco de dados
  await addDoc(mensagensRef, {
    texto: texto,
    horario: serverTimestamp() // Hora exata do servidor
  });
});

// ----------------------------------------------------
// PASSO B: ESCUTAR NOVAS MENSAGENS EM TEMPO REAL
// ----------------------------------------------------
const consultaOrdenada = query(mensagensRef, orderBy("horario", "asc"));

onSnapshot(consultaOrdenada, (snapshot) => {
  caixaMensagens.innerHTML = ""; // Limpa a tela para atualizar

  snapshot.forEach((doc) => {
    const dados = doc.data();
    if (dados.texto) {
      const div = document.createElement("div");
      div.classList.add("msg");
      div.textContent = dados.texto;
      caixaMensagens.appendChild(div);
    }
  });

  // Rola a caixa para a última mensagem automaticamente
  caixaMensagens.scrollTop = caixaMensagens.scrollHeight;
});