/** Utilidades puras de la agenda administrativa (Hito 3.3-A). */

export interface OcupacionMinutos {
  inicio: number;
  fin: number;
}

export interface FranjaLaboral {
  /** "HH:MM" hora Lima. */
  apertura: string;
  /** "HH:MM" hora Lima. */
  cierre: string;
  descanso?: { desde: string; hasta: string };
}

export function minutosDeHora(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function horaDeMinutos(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Fecha Lima "YYYY-MM-DD" de un ISO timestamptz. */
export function fechaLimaDeIso(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Lima" });
}

/** Hora Lima "HH:MM" de un ISO timestamptz. */
export function horaLimaDeIso(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Lima",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** Duración en minutos entre dos ISO timestamptz. */
export function minutosDeDuracion(inicioIso: string, finIso: string): number {
  return Math.round((new Date(finIso).getTime() - new Date(inicioIso).getTime()) / 60_000);
}

/**
 * Una retención HELD está expirada cuando su ventana venció.
 * Solo aplica a HELD; otros estados nunca cuentan como retención.
 */
export function esRetencionExpirada(
  status: string,
  holdExpiresAt: string | null,
  ahoraIso: string,
): boolean {
  if (status !== "HELD") return false;
  if (!holdExpiresAt) return true;
  return new Date(holdExpiresAt).getTime() <= new Date(ahoraIso).getTime();
}

/** Convierte "HH:MM" a minutos; inválidos van a 0. */
function aMinutos(hhmm: string): number {
  return minutosDeHora(hhmm);
}

/**
 * Calcula los huecos libres de un día dentro de la franja laboral,
 * descontando descanso y ocupaciones (citas vigentes y bloqueos).
 */
export function huecosLibres(
  franja: FranjaLaboral,
  ocupaciones: OcupacionMinutos[],
  minimoMinutos = 0,
): OcupacionMinutos[] {
  const apertura = aMinutos(franja.apertura);
  const cierre = aMinutos(franja.cierre);
  if (cierre <= apertura) return [];

  const bloqueados: OcupacionMinutos[] = ocupaciones
    .map((o) => ({
      inicio: Math.max(o.inicio, apertura),
      fin: Math.min(o.fin, cierre),
    }))
    .filter((o) => o.fin > o.inicio);

  if (franja.descanso) {
    const d = aMinutos(franja.descanso.desde);
    const h = aMinutos(franja.descanso.hasta);
    if (h > d) bloqueados.push({ inicio: Math.max(d, apertura), fin: Math.min(h, cierre) });
  }

  bloqueados.sort((a, b) => a.inicio - b.inicio);

  const libres: OcupacionMinutos[] = [];
  let cursor = apertura;
  for (const b of bloqueados) {
    if (b.inicio > cursor && b.inicio - cursor >= minimoMinutos) {
      libres.push({ inicio: cursor, fin: b.inicio });
    }
    cursor = Math.max(cursor, b.fin);
  }
  if (cierre > cursor && cierre - cursor >= minimoMinutos) {
    libres.push({ inicio: cursor, fin: cierre });
  }
  return libres;
}

const ETIQUETAS_ORIGEN: Record<string, string> = {
  WEB: "Web",
  IN_PERSON: "Presencial",
  ADMIN: "Administración",
};

export function etiquetaOrigen(origin: string): string {
  return ETIQUETAS_ORIGEN[origin] ?? origin;
}

/** Día de la semana JS (0=domingo) de una fecha "YYYY-MM-DD" Lima. */
export function weekdayDeFechaLima(fecha: string): number {
  return new Date(`${fecha}T12:00:00Z`).getUTCDay();
}
