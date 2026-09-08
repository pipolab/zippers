import { fmtMoneda, fmtNum } from "./merma";

function filtrarPorFoco(ordenes, foco) {
  const termino = (foco || "").trim().toLowerCase();
  if (!termino) return ordenes;
  return ordenes.filter((o) =>
    [o.referenciaCodigo, o.referenciaNombre, o.operario, o.turno]
      .filter(Boolean)
      .some((campo) => campo.toLowerCase().includes(termino))
  );
}

function resumir(ordenes) {
  const consumidos = ordenes.reduce((s, o) => s + (Number(o.metrosConsumidos) || 0), 0);
  const perdidos = ordenes.reduce((s, o) => s + (Number(o.metrosPerdidos) || 0), 0);
  const costo = ordenes.reduce((s, o) => s + (Number(o.costoPerdida) || 0), 0);
  const porcentaje = consumidos > 0 ? (perdidos / consumidos) * 100 : 0;
  const sobreUmbral = ordenes.filter((o) => o.estado === "ALERTA" || o.estado === "CRÍTICO");

  const porClave = (campo) => {
    const grupos = new Map();
    for (const o of ordenes) {
      const clave = o[campo] || "Sin dato";
      const actual = grupos.get(clave) || { clave, consumidos: 0, perdidos: 0, costo: 0, ordenes: 0 };
      actual.consumidos += Number(o.metrosConsumidos) || 0;
      actual.perdidos += Number(o.metrosPerdidos) || 0;
      actual.costo += Number(o.costoPerdida) || 0;
      actual.ordenes += 1;
      grupos.set(clave, actual);
    }
    return [...grupos.values()]
      .map((g) => ({ ...g, porcentaje: g.consumidos > 0 ? (g.perdidos / g.consumidos) * 100 : 0 }))
      .sort((a, b) => b.porcentaje - a.porcentaje);
  };

  return {
    consumidos,
    perdidos,
    costo,
    porcentaje,
    sobreUmbral,
    porOperario: porClave("operario"),
    porReferencia: porClave("referenciaCodigo"),
  };
}

export function diagnosticarMerma(ordenes, foco) {
  const filtradas = filtrarPorFoco(ordenes, foco);
  if (filtradas.length === 0) {
    return foco
      ? `No hay órdenes que coincidan con "${foco}" todavía.`
      : "No hay órdenes registradas todavía. Registra algunas desde la vista Operario para ver el diagnóstico.";
  }

  const r = resumir(filtradas);
  const peorOperario = r.porOperario[0];
  const peorReferencia = r.porReferencia[0];
  const alcance = foco ? ` (filtrado por "${foco}")` : "";

  const lineas = [];
  lineas.push(
    `Diagnóstico de merma${alcance}: sobre ${filtradas.length} órdenes analizadas, la merma ponderada es de ${fmtNum(r.porcentaje)}% (${fmtNum(r.perdidos)} m perdidos, ${fmtMoneda(r.costo)}).`
  );

  if (peorOperario) {
    lineas.push(
      `El mayor foco de pérdida por operario es ${peorOperario.clave}, con ${fmtNum(peorOperario.porcentaje)}% de merma en ${peorOperario.ordenes} órdenes (${fmtMoneda(peorOperario.costo)}).`
    );
  }
  if (peorReferencia) {
    lineas.push(
      `La referencia con más desperdicio es ${peorReferencia.clave}, con ${fmtNum(peorReferencia.porcentaje)}% de merma sobre los metros que consume.`
    );
  }
  if (r.sobreUmbral.length > 0) {
    lineas.push(
      `${r.sobreUmbral.length} de ${filtradas.length} órdenes están en alerta o crítico. Revisar esas órdenes primero suele dar el ahorro más rápido.`
    );
  } else {
    lineas.push("Ninguna orden está en alerta o crítico en este momento: la operación está dentro de los umbrales esperados.");
  }

  lineas.push(
    "Recomendación para esta semana: acompañar en planta al operario con mayor % de merma durante un par de órdenes, y revisar si el consumo estándar de la referencia más afectada sigue siendo realista frente al ancho real de los rollos que está llegando."
  );

  return lineas.join("\n\n");
}

export function redactarConclusiones(ordenes, foco) {
  const filtradas = filtrarPorFoco(ordenes, foco);
  if (filtradas.length === 0) {
    return foco
      ? `No hay datos suficientes sobre "${foco}" para redactar conclusiones.`
      : "No hay datos suficientes todavía para redactar conclusiones.";
  }

  const r = resumir(filtradas);
  const alcance = foco ? ` con foco en ${foco}` : "";

  return [
    `Durante el periodo analizado${alcance}, la planta registró ${filtradas.length} órdenes de corte con una merma promedio ponderada de ${fmtNum(r.porcentaje)}%, equivalente a ${fmtNum(r.perdidos)} metros y ${fmtMoneda(r.costo)} valorados al precio de compra de la tela.`,
    r.porOperario[0]
      ? `El operario ${r.porOperario[0].clave} concentra la mayor proporción de pérdida (${fmtNum(r.porOperario[0].porcentaje)}%), mientras que ${r.porOperario[r.porOperario.length - 1].clave} mantiene el desempeño más eficiente del grupo.`
      : "",
    r.porReferencia[0]
      ? `Por tipo de producto, ${r.porReferencia[0].clave} presenta el mayor desperdicio relativo, lo que sugiere revisar el patrón de corte o el consumo estándar asignado a esa referencia.`
      : "",
    `Se recomienda priorizar seguimiento sobre las ${r.sobreUmbral.length} órdenes que superan el umbral de alerta, y reforzar el aprovechamiento de remanentes reutilizables ya disponibles en planta antes de abrir nuevos rollos.`,
  ]
    .filter(Boolean)
    .join(" ");
}
