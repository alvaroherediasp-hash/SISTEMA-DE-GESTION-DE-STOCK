// ============================================================
// CONFIGURACIÓN DE FIREBASE
// ============================================================
// Reemplaza estos valores con los de tu proyecto Firebase.
// Para obtenerlos: Firebase Console > Configuración > General >
// "Agregar app" > Web > Copiar el objeto firebaseConfig
// ============================================================

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.firebasestorage.app",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();