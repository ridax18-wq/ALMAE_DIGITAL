export const ZONA_LIMA_OFFSET = "-05:00";
export const MAX_DIAS_BLOQUEO = 90;

export const TIPOS_BLOQUEO = [
  { valor: "BREAK", etiqueta: "Descanso", clases: "border-sage-300 bg-sage-50 text-sage-900" },
  { valor: "LUNCH", etiqueta: "Almuerzo", clases: "border-sand-300 bg-sand-100 text-sand-900" },
  { valor: "ABSENCE", etiqueta: "Ausencia", clases: "border-ink-300 bg-ink-50 text-ink-800" },
  { valor: "VACATION", etiqueta: "Vacaciones", clases: "border-brand-300 bg-brand-50 text-brand-900" },
  { valor: "TRAINING", etiqueta: "Capacitación", clases: "border-sage-500 bg-sage-100 text-sage-900" },
  { valor: "MAINTENANCE", etiqueta: "Mantenimiento", clases: "border-ink-400 bg-white text-ink-900" },
  { valor: "OTHER", etiqueta: "Otros", clases: "border-dashed border-ink-300 bg-white text-ink-700" },
] as const;

export type TipoBloqueo = (typeof TIPOS_BLOQUEO)[number]["valor"];

const ETIQUETAS_LEGADAS: Record<string, string> = { INTERNAL: "Interno" };
const CLASES_LEGADAS = "border-dashed border-ink-300 bg-white text-ink-700";

export function etiquetaTipoBloqueo(tipo: string): string {
  return (
    TIPOS_BLOQUEO.find((t) => t.valor === tipo)?.etiqueta ?? ETIQUETAS_LEGADAS[tipo] ?? tipo
  );
}

export function clasesTipoBloqueo(tipo: string): string {
  return TIPOS_BLOQUEO.find((t) => t.valor === tipo)?.clases ?? CLASES_LEGADAS;
}

export type IntervaloBloqueo = {
  fechaInicio: string;
  horaInicio: string;
  fechaFin: string;
  horaFin: string;
};

export type ResultadoIntervalo =
  | { ok: true; inicioIso: string; finIso: string; duracionMinutos: number }
  | { ok: false; error: string };

const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const REGEX_HORA = /^\d{2}:\d{2}$/;

function esFechaDeCalendario(iso: string): boolean {
  if (!REGEX_FECHA.test(iso)) return false;
  const [anio, mes, dia] = iso.split("-").map(Number);
  if (anio === undefined || mes === undefined || dia === undefined) return false;
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  return d.getUTCFullYear() === anio && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
}

export function validarIntervaloBloqueo(entrada: IntervaloBloqueo): ResultadoIntervalo {
  if (!esFechaDeCalendario(entrada.fechaInicio) || !esFechaDeCalendario(entrada.fechaFin)) {
    return { ok: false, error: "Fecha inválida" };
  }
  if (!REGEX_HORA.test(entrada.horaInicio) || !REGEX_HORA.test(entrada.horaFin)) {
    return { ok: false, error: "Hora inválida" };
  }

  const inicioIso = `${entrada.fechaInicio}T${entrada.horaInicio}:00${ZONA_LIMA_OFFSET}`;
  const finIso = `${entrada.fechaFin}T${entrada.horaFin}:00${ZONA_LIMA_OFFSET}`;
  const inicio = new Date(inicioIso).getTime();
  const fin = new Date(finIso).getTime();

  if (Number.isNaN(inicio) || Number.isNaN(fin)) {
    return { ok: false, error: "Fecha u hora inexistente" };
  }
  if (fin <= inicio) {
    return { ok: false, error: "La hora final debe ser posterior al inicio del bloqueo" };
  }
  if (fin - inicio > MAX_DIAS_BLOQUEO * 24 * 60 * 60_000) {
    return { ok: false, error: `El bloqueo no puede durar más de ${MAX_DIAS_BLOQUEO} días` };
  }

  return {
    ok: true,
    inicioIso,
    finIso,
    duracionMinutos: Math.round((fin - inicio) / 60_000),
  };
}

export function textoDuracion(minutos: number): string {
  const dias = Math.floor(minutos / (24 * 60));
  const horas = Math.floor((minutos % (24 * 60)) / 60);
  const mins = minutos % 60;
  const partes: string[] = [];
  if (dias > 0) partes.push(`${dias} ${dias === 1 ? "día" : "días"}`);
  if (horas > 0) partes.push(`${horas} h`);
  if (mins > 0) partes.push(`${mins} min`);
  return partes.join(" ") || "0 min";
}

function formatoFechaCorta(iso: string): string {
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

export function vistaPreviaBloqueo(entrada: IntervaloBloqueo): string | null {
  const r = validarIntervaloBloqueo(entrada);
  if (!r.ok) return null;
  return `Desde ${formatoFechaCorta(entrada.fechaInicio)} ${entrada.horaInicio} hasta ${formatoFechaCorta(entrada.fechaFin)} ${entrada.horaFin} (${textoDuracion(r.duracionMinutos)})`;
}
