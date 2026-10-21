/** Configuración centralizada de idioma y formatos de ALMAE Digital. */
export const DEFAULT_LOCALE = "es-PE";
export const TIMEZONE = "America/Lima";
export const CURRENCY = "PEN";

/** Fecha corta DD/MM/AAAA según la zona del negocio. */
export function fechaCorta(isoInstante: string): string {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(isoInstante));
}

/** Hora HH:mm según la zona del negocio. */
export function horaCorta(isoInstante: string): string {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoInstante));
}

/** "lunes, 20/10/2026" — día de la semana + fecha corta. */
export function fechaLargaConDia(isoInstante: string): string {
  const fecha = new Date(isoInstante);
  const dia = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    timeZone: TIMEZONE,
    weekday: "long",
  }).format(fecha);
  const capitalizada = dia.charAt(0).toUpperCase() + dia.slice(1);
  return `${capitalizada}, ${fechaCorta(isoInstante)}`;
}
