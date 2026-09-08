import { useState } from "react";
import { diagnosticarMerma, redactarConclusiones } from "../utils/analista";

export default function AnalistaView({ ordenes }) {
  const [foco, setFoco] = useState("");
  const [informe, setInforme] = useState("");

  return (
    <div className="vista">
      <p className="eyebrow">Analista de merma</p>
      <h2>Analista RETAL</h2>
      <p className="parrafo-intro">
        El analista lee los datos que hay ahora mismo en la planta —órdenes,
        operarios, referencias, rollos y remanentes— y arma el diagnóstico
        sobre esas cifras. Todo el cálculo ocurre en tu navegador: funciona
        sin cuenta, sin conexión y sin costo.
      </p>

      <div className="grid-dos-columnas">
        <div className="tarjeta">
          <div className="tarjeta-titulo">
            <h3>Qué quieres pedirle</h3>
          </div>

          <p className="nota-discreta">
            Dónde se está perdiendo la tela y qué hacer esta semana.
          </p>
          <button
            className="boton-primario boton-ancho"
            onClick={() => setInforme(diagnosticarMerma(ordenes, foco))}
          >
            Diagnosticar la merma
          </button>

          <p className="nota-discreta espaciado-superior">
            Texto de hallazgos y recomendaciones listo para el informe.
          </p>
          <button
            className="boton-secundario boton-ancho"
            onClick={() => setInforme(redactarConclusiones(ordenes, foco))}
          >
            Redactar conclusiones
          </button>

          <div className="campo espaciado-superior">
            <label>Foco opcional</label>
            <input
              type="text"
              value={foco}
              onChange={(e) => setFoco(e.target.value)}
              placeholder="Ej: solo sábanas, o el turno de la noche"
            />
          </div>

          <p className="nota-caja">
            El análisis se calcula sobre los datos cargados en la planta. Si
            registras órdenes nuevas en la vista de operario, el diagnóstico
            cambia con ellas.
          </p>
        </div>

        <div className="tarjeta">
          <div className="tarjeta-titulo">
            <h3>Informe del analista</h3>
          </div>
          {informe ? (
            <p className="informe-texto">{informe}</p>
          ) : (
            <p className="texto-vacio">
              Elige una acción a la izquierda. El informe se arma con las
              órdenes, rollos y remanentes que hay cargados en este momento.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
