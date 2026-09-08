import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";

// Se conecta a una colección de Firestore y mantiene el estado
// sincronizado en vivo: si alguien registra algo desde otro computador,
// este hook actualiza los datos automáticamente en todas las pantallas
// abiertas, sin necesidad de recargar.
export default function useColeccion(nombreColeccion, ordenarPorCampo) {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ref = collection(db, nombreColeccion);
    const consulta = ordenarPorCampo
      ? query(ref, orderBy(ordenarPorCampo, "desc"))
      : ref;

    const detener = onSnapshot(
      consulta,
      (snapshot) => {
        setDatos(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setCargando(false);
      },
      (err) => {
        console.error(`Error leyendo "${nombreColeccion}":`, err);
        setError(err);
        setCargando(false);
      }
    );

    return () => detener();
  }, [nombreColeccion, ordenarPorCampo]);

  return { datos, cargando, error };
}
