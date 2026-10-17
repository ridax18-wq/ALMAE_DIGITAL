export function formatPen(amount: number): string {
  const fixed = Math.abs(amount).toFixed(2);
  const parts = fixed.split(".");
  const entera = parts[0] ?? "0";
  const decimales = parts[1] ?? "00";
  const miles = entera.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const signo = amount < 0 ? "-" : "";
  return `${signo}S/ ${miles},${decimales}`;
}

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "setiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const DIAS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

/** Formatea "2026-10-20 09:00:00" (hora Lima) → "lunes 20 de octubre de 2026". */
export function formatFechaLima(inicioLima: string): string {
  const [fecha, hora] = inicioLima.split(/[T ]/);
  const [y, m, d] = (fecha ?? "").split("-").map(Number);
  if (!y || !m || !d) return inicioLima;

  const [h, min] = (hora ?? "00:00:00").split(":").map(Number);
  const referencia = new Date(Date.UTC(y, m - 1, d, 12));
  const diaSemana = DIAS[referencia.getUTCDay()] ?? "";

  return `${diaSemana} ${d} de ${MESES[m - 1]} de ${y}${h !== undefined && min !== undefined && (h > 0 || min > 0) ? "" : ""}`;
}

/** Formatea la ventana horaria "09:00" → "09:00 – 10:00". */
export function formatHorarioLima(inicioLima: string, finLima: string): string {
  const [inicio, fin] = [inicioLima, finLima].map((v) => {
    const hora = v.split(/[T ]/)[1];
    return hora ? hora.slice(0, 5) : "";
  });
  return `${inicio} – ${fin}`;
}
