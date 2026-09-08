import { useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  increment,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { siguienteNumero } from "../utils/contadores";
import { calcularMerma, fmtMoneda, fmtNum } from "../utils/merma";
import StatusBadge from "./StatusBadge";

const TURNOS = ["Mañana", "Tarde", "Noche"];
const VACIO_ORDEN = {
  rolloId: "",
  referenciaId: "",
  operario: "",
  turno: TURNOS[0],
  unidadesCortadas: "",
  metrosConsumidos: "",
  remanenteAprovechable: "0",
};
const VACIO_ROLLO = {
  material: "",
  color: "",
  tono: "",
  proveedor: "",
  ancho: "",
  metrosIngresados: "",
  precioPorMetro: "",
};

export default function OperarioView({ rollos, referencias, ordenes }) {
  const [orden, setOrden] = useState(VACIO_ORDEN);
  const [rolloForm, setRolloForm] = useState(VACIO_ROLLO);
  const [guardandoOrden, setGuardandoOrden] = useState(false);
  const [guardandoRollo, setGuardandoRollo] = useState(false);
  const [errorOrden, setErrorOrden] = useState("");
  const [errorRollo, setErrorRollo] = useState("");

  const rolloSeleccionado = rollos.find((r) => r.id === orden.rolloId);
  const referenciaSeleccionada = referencias.find(
    (r) => r.id === orden.referenciaId
  );

  const calculo = useMemo(() => {
    if (!referenciaSeleccionada) return null;
    return calcularMerma({
      unidadesCortadas: orden.unidadesCortadas,
      consumoEstandar: referenciaSeleccionada.consumoEstandar,
      metrosConsumidos: orden.metrosConsumidos,
      precioPorMetro: rolloSeleccionado?.precioPorMetro,
    });
  }, [orden.unidadesCortadas, orden.metrosConsumidos, referenciaSeleccionada, rolloSeleccionado]);

  function actualizarOrden(campo, valor) {
    setOrden((prev) => ({ ...prev, [campo]: valor }));
  }

  function limpiarOrden() {
    setOrden(VACIO_ORDEN);
    setErrorOrden("");
  }

  async function registrarOrden(e) {
    e.preventDefault();
    setErrorOrden("");

    if (!rolloSeleccionado || !referenciaSeleccionada) {
      setErrorOrden("Selecciona un rollo y una referencia.");
      return;
    }
    const unidades = Number(orden.unidadesCortadas);
    const consumidos = Number(orden.metrosConsumidos);
    const remanente = Number(orden.remanenteAprovechable) || 0;

    if (!unidades || unidades <= 0) {
      setErrorOrden("Las unidades cortadas deben ser mayores a 0.");
      return;
    }
    if (!consumidos || consumidos <= 0) {
      setErrorOrden("Los metros consumidos deben ser mayores a 0.");
      return;
    }
    if (consumidos > Number(rolloSeleccionado.saldo)) {
      setErrorOrden(
        `Ese rollo solo tiene ${fmtNum(rolloSeleccionado.saldo)} m de saldo disponible.`
      );
      return;
    }

    setGuardandoOrden(true);
    try {
      const resultado = calcularMerma({
        unidadesCortadas: unidades,
        consumoEstandar: referenciaSeleccionada.consumoEstandar,
        metrosConsumidos: consumidos,
        precioPorMetro: rolloSeleccionado.precioPorMetro,
      });
      const numero = await siguienteNumero("ordenes", "OC", 1001);

      await addDoc(collection(db, "ordenes"), {
        numero,
        fecha: new Date().toISOString().slice(0, 10),
        rolloId: rolloSeleccionado.id,
        rolloCodigo: rolloSeleccionado.codigo,
        referenciaId: referenciaSeleccionada.id,
        referenciaCodigo: referenciaSeleccionada.codigo,
        referenciaNombre: referenciaSeleccionada.nombre,
        operario: orden.operario.trim() || "Sin nombre",
        turno: orden.turno,
        unidadesCortadas: unidades,
        metrosConsumidos: consumidos,
        metrosTeoricos: resultado.metrosTeoricos,
        metrosPerdidos: resultado.metrosPerdidos,
        porcentajeMerma: resultado.porcentajeMerma,
        estado: resultado.estado,
        costoPerdida: resultado.costoPerdida,
        remanenteAprovechable: remanente,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "rollos", rolloSeleccionado.id), {
        metrosConsumidos: increment(consumidos),
        saldo: increment(-consumidos),
      });

      if (remanente > 0) {
        await addDoc(collection(db, "remanentes"), {
          rolloCodigo: rolloSeleccionado.codigo,
          ordenNumero: numero,
          metros: remanente,
          color: rolloSeleccionado.color,
          material: rolloSeleccionado.material,
          ancho: rolloSeleccionado.ancho,
          estado: "disponible",
          createdAt: serverTimestamp(),
        });
      }

      limpiarOrden();
    } catch (err) {
      console.error(err);
      setErrorOrden("No se pudo registrar la orden. Intenta de nuevo.");
    } finally {
      setGuardandoOrden(false);
    }
  }

  async function ingresarRollo(e) {
    e.preventDefault();
    setErrorRollo("");

    const metros = Number(rolloForm.metrosIngresados);
    const precio = Number(rolloForm.precioPorMetro);
    if (!rolloForm.material.trim() || !rolloForm.color.trim()) {
      setErrorRollo("Material y color son obligatorios.");
      return;
    }
    if (!metros || metros <= 0) {
      setErrorRollo("Los metros ingresados deben ser mayores a 0.");
      return;
    }

    setGuardandoRollo(true);
    try {
      const codigo = await siguienteNumero("rollos", "R", 2601);
      await addDoc(collection(db, "rollos"), {
        codigo,
        material: rolloForm.material.trim(),
        color: rolloForm.color.trim(),
        tono: rolloForm.tono.trim(),
        proveedor: rolloForm.proveedor.trim(),
        ancho: Number(rolloForm.ancho) || 0,
        metrosIngresados: metros,
        precioPorMetro: precio || 0,
        metrosConsumidos: 0,
        saldo: metros,
        createdAt: serverTimestamp(),
      });
      setRolloForm(VACIO_ROLLO);
    } catch (err) {
      console.error(err);
      setErrorRollo("No se pudo ingresar el rollo. Intenta de nuevo.");
    } finally {
      setGuardandoRollo(false);
    }
  }

  const ultimasOrdenes = ordenes.slice(0, 10);

  return (
    <div className="vista">
      <p className="eyebrow">Turno en planta</p>
      <h2>Registro de corte</h2>
      <p className="parrafo-intro">
        Cada orden se cierra en menos de un minuto. El sistema calcula la
        merma comparando el consumo estándar de la referencia contra los
        metros que realmente saliste a cortar.
      </p>

      <div className="grid-dos-columnas">
        <form className="tarjeta" onSubmit={registrarOrden}>
          <div className="tarjeta-titulo">
            <h3>Nueva orden de corte</h3>
          </div>

          <div className="campo">
            <label>Rollo</label>
            <select
              value={orden.rolloId}
              onChange={(e) => actualizarOrden("rolloId", e.target.value)}
            >
              <option value="">Selecciona un rollo</option>
              {rollos
                .filter((r) => Number(r.saldo) > 0)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.codigo} · {r.color} · saldo {fmtNum(r.saldo)} m
                  </option>
                ))}
            </select>
          </div>

          <div className="campo">
            <label>Referencia</label>
            <select
              value={orden.referenciaId}
              onChange={(e) => actualizarOrden("referenciaId", e.target.value)}
            >
              <option value="">Selecciona una referencia</option>
              {referencias.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.codigo} · {r.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="campo-fila">
            <div className="campo">
              <label>Operario</label>
              <input
                type="text"
                value={orden.operario}
                onChange={(e) => actualizarOrden("operario", e.target.value)}
                placeholder="Nombre de quien corta"
              />
            </div>
            <div className="campo">
              <label>Turno</label>
              <select
                value={orden.turno}
                onChange={(e) => actualizarOrden("turno", e.target.value)}
              >
                {TURNOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="campo-fila">
            <div className="campo">
              <label>Unidades cortadas</label>
              <input
                type="number"
                min="0"
                value={orden.unidadesCortadas}
                onChange={(e) =>
                  actualizarOrden("unidadesCortadas", e.target.value)
                }
              />
            </div>
            <div className="campo">
              <label>Metros consumidos del rollo</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={orden.metrosConsumidos}
                onChange={(e) =>
                  actualizarOrden("metrosConsumidos", e.target.value)
                }
              />
            </div>
          </div>

          <div className="campo">
            <label>Remanente aprovechable (m)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={orden.remanenteAprovechable}
              onChange={(e) =>
                actualizarOrden("remanenteAprovechable", e.target.value)
              }
            />
          </div>

          {errorOrden && <p className="mensaje-error">{errorOrden}</p>}

          <div className="botones">
            <button type="submit" className="boton-primario" disabled={guardandoOrden}>
              {guardandoOrden ? "Registrando…" : "Registrar orden"}
            </button>
            <button type="button" className="boton-secundario" onClick={limpiarOrden}>
              Limpiar
            </button>
          </div>
        </form>

        <div className="tarjeta panel-merma">
          <p className="eyebrow">Merma calculada</p>
          {calculo ? (
            <>
              <div
                className="merma-grande"
                data-estado={calculo.estado}
              >
                {fmtNum(calculo.porcentajeMerma)}%
                <StatusBadge estado={calculo.estado} />
              </div>
              <dl className="lista-datos">
                <div>
                  <dt>Consumo estándar</dt>
                  <dd>{fmtNum(referenciaSeleccionada.consumoEstandar, 2)} m/und</dd>
                </div>
                <div>
                  <dt>Metros teóricos</dt>
                  <dd>{fmtNum(calculo.metrosTeoricos)} m</dd>
                </div>
                <div>
                  <dt>Metros consumidos</dt>
                  <dd>{fmtNum(orden.metrosConsumidos)} m</dd>
                </div>
                <div>
                  <dt>Metros perdidos</dt>
                  <dd>{fmtNum(calculo.metrosPerdidos)} m</dd>
                </div>
                <div>
                  <dt>Costo de la pérdida</dt>
                  <dd>{fmtMoneda(calculo.costoPerdida)}</dd>
                </div>
                {rolloSeleccionado && (
                  <div>
                    <dt>Saldo tras el corte</dt>
                    <dd>
                      {fmtNum(
                        Number(rolloSeleccionado.saldo) -
                          (Number(orden.metrosConsumidos) || 0)
                      )}{" "}
                      m
                    </dd>
                  </div>
                )}
              </dl>
            </>
          ) : (
            <p className="texto-vacio">
              Elige una referencia y llena las unidades y metros consumidos
              para ver el cálculo.
            </p>
          )}
        </div>
      </div>

      <form className="tarjeta" onSubmit={ingresarRollo}>
        <div className="tarjeta-titulo">
          <h3>Ingreso de rollo</h3>
        </div>
        <div className="campo">
          <label>Material / Composición</label>
          <input
            type="text"
            value={rolloForm.material}
            onChange={(e) =>
              setRolloForm((p) => ({ ...p, material: e.target.value }))
            }
            placeholder="Ej. Percal 100% algodón 180 hilos"
          />
        </div>
        <div className="campo-fila">
          <div className="campo">
            <label>Color</label>
            <input
              type="text"
              value={rolloForm.color}
              onChange={(e) =>
                setRolloForm((p) => ({ ...p, color: e.target.value }))
              }
            />
          </div>
          <div className="campo">
            <label>Tono</label>
            <input
              type="text"
              value={rolloForm.tono}
              onChange={(e) =>
                setRolloForm((p) => ({ ...p, tono: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="campo-fila">
          <div className="campo">
            <label>Proveedor</label>
            <input
              type="text"
              value={rolloForm.proveedor}
              onChange={(e) =>
                setRolloForm((p) => ({ ...p, proveedor: e.target.value }))
              }
            />
          </div>
          <div className="campo">
            <label>Ancho (m)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={rolloForm.ancho}
              onChange={(e) =>
                setRolloForm((p) => ({ ...p, ancho: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="campo-fila">
          <div className="campo">
            <label>Metros ingresados</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={rolloForm.metrosIngresados}
              onChange={(e) =>
                setRolloForm((p) => ({ ...p, metrosIngresados: e.target.value }))
              }
            />
          </div>
          <div className="campo">
            <label>Precio por metro (COP)</label>
            <input
              type="number"
              min="0"
              value={rolloForm.precioPorMetro}
              onChange={(e) =>
                setRolloForm((p) => ({ ...p, precioPorMetro: e.target.value }))
              }
            />
          </div>
        </div>

        {errorRollo && <p className="mensaje-error">{errorRollo}</p>}

        <div className="botones">
          <button type="submit" className="boton-secundario" disabled={guardandoRollo}>
            {guardandoRollo ? "Guardando…" : "Ingresar rollo"}
          </button>
        </div>
      </form>

      <div className="tarjeta">
        <div className="tarjeta-titulo tarjeta-titulo-con-nota">
          <h3>Últimas órdenes registradas</h3>
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
                <th>Teóricos</th>
                <th>Consumidos</th>
                <th>Merma</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {ultimasOrdenes.length === 0 && (
                <tr>
                  <td colSpan={8} className="texto-vacio">
                    Todavía no hay órdenes registradas.
                  </td>
                </tr>
              )}
              {ultimasOrdenes.map((o) => (
                <tr key={o.id}>
                  <td>{o.numero}</td>
                  <td>{o.fecha}</td>
                  <td>{o.referenciaCodigo}</td>
                  <td>{o.operario}</td>
                  <td>{fmtNum(o.metrosTeoricos)}</td>
                  <td>{fmtNum(o.metrosConsumidos)}</td>
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
    </div>
  );
}
