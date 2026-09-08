import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";

/**
 * CONFIGURACIÓN DE FIREBASE
 * -------------------------
 * 1. Ve a https://console.firebase.google.com y crea un proyecto (el plan
 *    gratuito "Spark" es suficiente).
 * 2. Dentro del proyecto: "Agregar app" > ícono web (</>) > regístrala con
 *    cualquier nombre (ej. "retal-zippers").
 * 3. Firebase te mostrará un objeto como el de abajo: reemplaza estos
 *    valores de ejemplo por los tuyos.
 * 4. En el menú del proyecto, activa:
 *    - "Firestore Database" > Crear base de datos > modo producción.
 *    - "Authentication" > pestaña "Sign-in method" > habilita "Anonymous".
 * 5. En Firestore, ve a "Reglas" y pega las reglas incluidas en README.md
 *    (solo permiten leer/escribir a usuarios autenticados, aunque sea de
 *    forma anónima).
 */
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

// Inicia sesión anónima automáticamente para que cualquier persona con el
// enlace pueda usar la app sin crear cuenta, mientras las reglas de
// Firestore siguen exigiendo estar autenticado (bloquea a extraños de
// internet que no pasen por esta misma app).
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
