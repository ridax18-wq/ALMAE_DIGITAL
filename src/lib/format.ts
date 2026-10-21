import { DEFAULT_LOCALE } from "@/lib/locale";

/** Formatea un monto en céntimos → "S/ 20,00" (regla del proyecto). */
export function formatPen(cents: number): string {
  const amount = Math.abs(cents) / 100;
  const fixed = amount.toFixed(2);
  const parts = fixed.split(".");
  const entera = parts[0] ?? "0";
  const decimales = parts[1] ?? "00";
  const miles = entera.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const signo = cents < 0 ? "-" : "";
  void DEFAULT_LOCALE;
  return `${signo}S/ ${miles},${decimales}`;
}

/** Formatea "2026-10-20 09:00:00" (hora Lima) → "lunes, 20/10/2026" (DD/MM/AAAA). */
export function formatFechaLima(inicioLima: string): string {
  const [fecha] = inicioLima.split(/[T ]/);
  const [y, m, d] = (fecha ?? "").split("-").map(Number);
  if (!y || !m || !d) return inicioLima;

  const referencia = new Date(Date.UTC(y, m - 1, d, 12));
  const dia = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    timeZone: "UTC",
    weekday: "long",
  }).format(referencia);
  const capitalizado = dia.charAt(0).toUpperCase() + dia.slice(1);

  return `${capitalizado}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

/** Formatea la ventana horaria en hora Lima → "09:00 – 10:00". */
export function formatHorarioLima(inicioLima: string, finLima: string): string {
  const [inicio, fin] = [inicioLima, finLima].map((v) => {
    const hora = v.split(/[T ]/)[1];
    return hora ? hora.slice(0, 5) : "";
  });
  return `${inicio} – ${fin}`;
}
