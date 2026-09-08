import { useMemo, useState } from "react";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { fmtMoneda, fmtNum } from "../utils/merma";
import StatusBadge from "./StatusBadge";

function agrupar(ordenes, campoClave, campoEtiqueta) {
  const grupos = new Map();
  for (const o of ordenes) {
    const clave = o[campoClave] || "Sin dato";
    if (!grupos.has(clave)) {
      grupos.set(clave, {
        clave,
        etiqueta: campoEtiqueta ? o[campoEtiqueta] : clave,
        ordenes: 0,
        consumidos: 0,
        perdidos: 0,
        costo: 0,
      });
    }
    const g = grupos.get(clave);
    g.ordenes += 1;
    g.consumidos += Number(o.metrosConsumidos) || 0;
    g.perdidos += Number(o.metrosPerdidos) || 0;
    g.costo += Number(o.costoPerdida) || 0;
  }
  return [...grupos.values()]
    .map((g) => ({
      ...g,
      porcentaje: g.consumidos > 0 ? (g.perdidos / g.consumidos) * 100 : 0,
    }))
    .sort((a, b) => b.porcentaje - a.porcentaje);
}

function BarraGrupo({ grupo }) {
  const anchoBarra = Math.min(100, (grupo.porcentaje / 20) * 100);
  return (
    <div className="fila-barra">
      <div className="fila-barra-encabezado">
        <span>{grupo.etiqueta}</span>
        <strong>{fmtNum(grupo.porcentaje)}%</strong>
      </div>
      <div className="barra-fondo">
        <div className="barra-relleno" style={{ width: `${anchoBarra}%` }} />
      </div>
      <p className="nota-discreta">
        {grupo.ordenes} órdenes · {fmtNum(grupo.perdidos)} m perdidos ·{" "}
        {fmtMoneda(grupo.costo)}
      </p>
    </div>
  );
}

export default function JefeView({ ordenes, rollos, remanentes, referencias }) {
  const [nuevaRef, setNuevaRef] = useState({ codigo: "", nombre: "", consumoEstandar: "" });
  const [guardandoRef, setGuardandoRef] = useState(false);
  const [errorRef, setErrorRef] = useState("");

  const indicadores = useMemo(() => {
    const totalConsumidos = ordenes.reduce((s, o) => s + (Number(o.metrosConsumidos) || 0), 0);
    const totalPerdidos = ordenes.reduce((s, o) => s + (Number(o.metrosPerdidos) || 0), 0);
    const totalCosto = ordenes.reduce((s, o) => s + (Number(o.costoPerdida) || 0), 0);
    const sobreUmbral = ordenes.filter((o) => o.estado === "ALERTA" || o.estado === "CRÍTICO").length;
    const mermaPromedio = totalConsumidos > 0 ? (totalPerdidos / totalConsumidos) * 100 : 0;
    return { totalConsumidos, totalPerdidos, totalCosto, sobreUmbral, mermaPromedio };
  }, [ordenes]);

  const porOperario = useMemo(() => agrupar(ordenes, "operario"), [ordenes]);
  const porReferencia = useMemo(
    () => agrupar(ordenes, "referenciaCodigo", "referenciaNombre").map((g) => ({
      ...g,
      etiqueta: `${g.clave} · ${g.etiqueta || ""}`,
    })),
    [ordenes]
  );

  async function alternarRemanente(remanente) {
    const nuevoEstado = remanente.estado === "disponible" ? "usado" : "disponible";
    await updateDoc(doc(db, "remanentes", remanente.id), { estado: nuevoEstado });
  }

  async function agregarReferencia(e) {
    e.preventDefault();
    setErrorRef("");
    if (!nuevaRef.codigo.trim() || !nuevaRef.nombre.trim() || !nuevaRef.consumoEstandar) {
      setErrorRef("Completa código, nombre y consumo estándar.");
      return;
    }
    setGuardandoRef(true);
    try {
      await addDoc(collection(db, "referencias"), {
        codigo: nuevaRef.codigo.trim().toUpperCase(),
        nombre: nuevaRef.nombre.trim(),
        consumoEstandar: Number(nuevaRef.consumoEstandar),
        createdAt: serverTimestamp(),
      });
      setNuevaRef({ codigo: "", nombre: "", consumoEstandar: "" });
    } catch (err) {
      console.error(err);
      setErrorRef("No se pudo guardar la referencia.");
    } finally {
      setGuardandoRef(false);
    }
  }

  const disponibles = remanentes.filter((r) => r.estado === "disponible");
  const totalDisponible = disponibles.reduce((s, r) => s + (Number(r.metros) || 0), 0);

  return (
    <div className="vista">
      <p className="eyebrow">Indicadores de planta</p>
      <h2>Rendimiento de corte</h2>
      <p className="parrafo-intro">
        Umbrales tomados de los rangos de merma documentados para corte
        textil: hasta 5% eficiente, 8% dispara alerta y 15% se clasifica
        como crítico.
      </p>

      <div className="grid-kpis">
        <div className="tarjeta kpi">
          <p className="eyebrow">Merma promedio</p>
          <p className="kpi-valor">{fmtNum(indicadores.mermaPromedio)}%</p>
          <p className="nota-discreta">ponderada sobre metros consumidos</p>
        </div>
        <div className="tarjeta kpi">
          <p className="eyebrow">Metros perdidos</p>
          <p className="kpi-valor">{fmtNum(indicadores.totalPerdidos)} m</p>
          <p className="nota-discreta">de {fmtNum(indicadores.totalConsumidos)} m consumidos</p>
        </div>
        <div className="tarjeta kpi">
          <p className="eyebrow">Costo de la pérdida</p>
          <p className="kpi-valor">{fmtMoneda(indicadores.totalCosto)}</p>
          <p className="nota-discreta">a precio de compra del rollo</p>
        </div>
        <div className="tarjeta kpi">
          <p className="eyebrow">Órdenes sobre umbral</p>
          <p className="kpi-valor">
            {indicadores.sobreUmbral} / {ordenes.length}
          </p>
          <p className="nota-discreta">en alerta o crítico</p>
        </div>
      </div>

      <div className="grid-dos-columnas">
        <div className="tarjeta">
          <div className="tarjeta-titulo tarjeta-titulo-con-nota">
            <h3>Merma por operario</h3>
            <span className="nota-discreta">% sobre metros consumidos</span>
          </div>
          {porOperario.length === 0 ? (
            <p className="texto-vacio">Aún no hay órdenes registradas.</p>
          ) : (
            porOperario.map((g) => <BarraGrupo key={g.clave} grupo={g} />)
          )}
        </div>
        <div className="tarjeta">
          <div className="tarjeta-titulo tarjeta-titulo-con-nota">
            <h3>Merma por referencia</h3>
            <span className="nota-discreta">% sobre metros consumidos</span>
          </div>
          {porReferencia.length === 0 ? (
            <p className="texto-vacio">Aún no hay órdenes registradas.</p>
          ) : (
            porReferencia.map((g) => <BarraGrupo key={g.clave} grupo={g} />)
          )}
        </div>
      </div>

      <div className="tarjeta">
        <div className="tarjeta-titulo tarjeta-titulo-con-nota">
          <h3>Órdenes de corte</h3>
          <span className="nota-discreta">{ordenes.length} órdenes</span>
        </div>
        <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th>Orden</th>
                <th>Fecha</th>
                <th>Referencia</th>
                <th>Operario</th>
                <th>Rollo</th>
                <th>Und.</th>
                <th>Teóricos</th>
                <th>Consumidos</th>
                <th>Perdidos</th>
                <th>Merma</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {ordenes.length === 0 && (
                <tr>
                  <td colSpan={11} className="texto-vacio">
                    Todavía no hay órdenes registradas.
                  </td>
                </tr>
              )}
              {ordenes.map((o) => (
                <tr key={o.id}>
                  <td>{o.numero}</td>
                  <td>{o.fecha}</td>
                  <td>{o.referenciaCodigo}</td>
                  <td>{o.operario}</td>
                  <td>{o.rolloCodigo}</td>
                  <td>{o.unidadesCortadas}</td>
                  <td>{fmtNum(o.metrosTeoricos)}</td>
                  <td>{fmtNum(o.metrosConsumidos)}</td>
                  <td>{fmtNum(o.metrosPerdidos)}</td>
                  <td>{fmtNum(o.porcentajeMerma)}%</td>
                  <td>
                    <StatusBadge estado={o.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid-dos-columnas">
        <div className="tarjeta">
          <div className="tarjeta-titulo">
            <h3>Inventario de rollos</h3>
          </div>
          <div className="tabla-scroll">
            <table>
              <thead>
                <tr>
                  <th>Rollo</th>
                  <th>Material</th>
                  <th>Color</th>
                  <th>Ing.</th>
                  <th>Cons.</th>
                  <th>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {rollos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="texto-vacio">
                      Todavía no hay rollos ingresados.
                    </td>
                  </tr>
                )}
                {rollos.map((r) => (
                  <tr key={r.id}>
                    <td>{r.codigo}</td>
                    <td>{r.material}</td>
                    <td>{r.color}</td>
                    <td>{fmtNum(r.metrosIngresados)}</td>
                    <td>{fmtNum(r.metrosConsumidos)}</td>
                    <td>{fmtNum(r.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="tarjeta">
          <div className="tarjeta-titulo tarjeta-titulo-con-nota">
            <h3>Remanentes reutilizables</h3>
            <span className="nota-discreta">{fmtNum(totalDisponible)} m disponibles</span>
          </div>
          {remanentes.length === 0 ? (
            <p className="texto-vacio">Todavía no hay remanentes registrados.</p>
          ) : (
            <div className="grid-remanentes">
              {remanentes.map((r) => (
                <div key={r.id} className="tarjeta-remanente">
                  <p className="remanente-titulo">
                    {fmtNum(r.metros)} m · {r.color}
                  </p>
                  <p className="nota-discreta">
                    {r.rolloCodigo} · {r.ordenNumero}
                  </p>
                  <p className="nota-discreta">
                    {r.material} · ancho {fmtNum(r.ancho, 2)} m
                  </p>
                  <button className="boton-secundario" onClick={() => alternarRemanente(r)}>
                    {r.estado === "disponible" ? "Marcar usado" : "Marcar disponible"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="tarjeta">
        <div className="tarjeta-titulo">
          <h3>Referencias / productos</h3>
        </div>
        <div className="tabla-scroll">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Consumo estándar (m/und)</th>
              </tr>
            </thead>
            <tbody>
              {referencias.length === 0 && (
                <tr>
                  <td colSpan={3} className="texto-vacio">
                    Agrega la primera referencia con el formulario de abajo.
                  </td>
                </tr>
              )}
              {referencias.map((r) => (
                <tr key={r.id}>
                  <td>{r.codigo}</td>
                  <td>{r.nombre}</td>
                  <td>{fmtNum(r.consumoEstandar, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form className="campo-fila campo-fila-form" onSubmit={agregarReferencia}>
          <div className="campo">
            <label>Código</label>
            <input
              type="text"
              value={nuevaRef.codigo}
              onChange={(e) => setNuevaRef((p) => ({ ...p, codigo: e.target.value }))}
              placeholder="Ej. SAB-180"
            />
          </div>
          <div className="campo">
            <label>Nombre</label>
            <input
              type="text"
              value={nuevaRef.nombre}
              onChange={(e) => setNuevaRef((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej. Sábana ajustable 2 plazas"
            />
          </div>
          <div className="campo">
            <label>Consumo estándar (m/und)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={nuevaRef.consumoEstandar}
              onChange={(e) =>
                setNuevaRef((p) => ({ ...p, consumoEstandar: e.target.value }))
              }
            />
          </div>
          <div className="campo campo-boton-alineado">
            <button type="submit" className="boton-secundario" disabled={guardandoRef}>
              {guardandoRef ? "Guardando…" : "Agregar referencia"}
            </button>
          </div>
        </form>
        {errorRef && <p className="mensaje-error">{errorRef}</p>}
      </div>
    </div>
  );
}
