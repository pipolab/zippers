// Umbrales documentados en el prototipo original:
// hasta 5% = eficiente, entre 5% y 8% = normal, de 8% a 15% = alerta,
// 15% o más = crítico.
export const UMBRALES = { eficiente: 5, normal: 8, alerta: 15 };

export function clasificarEstado(porcentajeMerma) {
  if (porcentajeMerma <= UMBRALES.eficiente) return "EFICIENTE";
  if (porcentajeMerma <= UMBRALES.normal) return "NORMAL";
  if (porcentajeMerma <= UMBRALES.alerta) return "ALERTA";
  return "CRÍTICO";
}

export function calcularMerma({
  unidadesCortadas,
  consumoEstandar,
  metrosConsumidos,
  precioPorMetro,
}) {
  const unidades = Number(unidadesCortadas) || 0;
  const consumo = Number(consumoEstandar) || 0;
  const consumidos = Number(metrosConsumidos) || 0;
  const precio = Number(precioPorMetro) || 0;

  const metrosTeoricos = unidades * consumo;
  const metrosPerdidos = consumidos - metrosTeoricos;
  const porcentajeMerma =
    consumidos > 0 ? (metrosPerdidos / consumidos) * 100 : 0;
  const estado = clasificarEstado(porcentajeMerma);
  const costoPerdida = metrosPerdidos * precio;

  return { metrosTeoricos, metrosPerdidos, porcentajeMerma, estado, costoPerdida };
}

export function fmtNum(valor, decimales = 1) {
  return Number(valor || 0).toLocaleString("es-CO", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

export function fmtMoneda(valor) {
  return Number(valor || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}
