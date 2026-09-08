import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAwM2VlezCep_-4KgYF1lbwIx_osVtKiJ0",
  authDomain: "zippers-fdfb9.firebaseapp.com",
  projectId: "zippers-fdfb9",
  storageBucket: "zippers-fdfb9.firebasestorage.app",
  messagingSenderId: "1035861123266",
  appId: "1:1035861123266:web:81c0391a6dc8eab01a1b5b"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export function ensureSignedIn(onReady) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      onReady(user);
    } else {
      signInAnonymously(auth).catch((err) => {
        console.error("No se pudo iniciar sesión anónima:", err);
      });
    }
  });
}
