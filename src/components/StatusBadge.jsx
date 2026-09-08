const COLORES = {
  EFICIENTE: { bg: "#e3f3ea", fg: "#1f7a4d" },
  NORMAL: { bg: "#e8eaf2", fg: "#4a5178" },
  ALERTA: { bg: "#fbead2", fg: "#9c6112" },
  "CRÍTICO": { bg: "#fbe0df", fg: "#b3261e" },
};

export default function StatusBadge({ estado }) {
  const colores = COLORES[estado] || COLORES.NORMAL;
  return (
    <span
      className="badge"
      style={{ backgroundColor: colores.bg, color: colores.fg }}
    >
      ● {estado}
    </span>
  );
}
