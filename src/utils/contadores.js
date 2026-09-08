import { doc, runTransaction } from "firebase/firestore";
import { db } from "../firebase";

// Genera consecutivos tipo OC-1001, R-2601, etc. de forma segura aunque
// dos personas registren algo al mismo tiempo desde computadores distintos.
export async function siguienteNumero(nombreContador, prefijo, inicio) {
  const ref = doc(db, "contadores", nombreContador);
  const siguiente = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const actual = snap.exists() ? snap.data().valor : inicio - 1;
    const nuevoValor = actual + 1;
    tx.set(ref, { valor: nuevoValor }, { merge: true });
    return nuevoValor;
  });
  return `${prefijo}-${siguiente}`;
}
