import { useEffect, useState } from "react";
import { ensureSignedIn } from "./firebase";
import useColeccion from "./hooks/useColeccion";
import OperarioView from "./components/OperarioView";
import JefeView from "./components/JefeView";
import AnalistaView from "./components/AnalistaView";

const PESTANAS = [
  { id: "operario", etiqueta: "Operario" },
  { id: "jefe", etiqueta: "Jefe de producción" },
  { id: "analista", etiqueta: "Analista" },
];

export default function App() {
  const [pestanaActiva, setPestanaActiva] = useState("operario");
  const [listo, setListo] = useState(false);

  useEffect(() => {
    ensureSignedIn(() => setListo(true));
  }, []);

  const { datos: rollos } = useColeccion("rollos", "createdAt");
  const { datos: referencias } = useColeccion("referencias", "createdAt");
  const { datos: ordenes } = useColeccion("ordenes", "createdAt");
  const { datos: remanentes } = useColeccion("remanentes", "createdAt");

  if (!listo) {
    return (
      <div className="pantalla-carga">
        <p>Conectando con la planta…</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="encabezado">
        <div className="marca">
          <span className="logo">RETAL</span>
          <span className="submarca">Zippers · Planta de corte · Bogotá</span>
        </div>
        <nav className="pestanas">
          {PESTANAS.map((p) => (
            <button
              key={p.id}
              className={p.id === pestanaActiva ? "pestana pestana-activa" : "pestana"}
              onClick={() => setPestanaActiva(p.id)}
            >
              {p.etiqueta}
            </button>
          ))}
        </nav>
      </header>
      <div className="franja-grafo" />

      <main className="contenido">
        {pestanaActiva === "operario" && (
          <OperarioView rollos={rollos} referencias={referencias} ordenes={ordenes} />
        )}
        {pestanaActiva === "jefe" && (
          <JefeView
            ordenes={ordenes}
            rollos={rollos}
            remanentes={remanentes}
            referencias={referencias}
          />
        )}
        {pestanaActiva === "analista" && <AnalistaView ordenes={ordenes} />}
      </main>

      <footer className="pie">RETAL · Control de inventario y merma textil · Zippers</footer>
    </div>
  );
}
