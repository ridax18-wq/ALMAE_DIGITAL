export interface DatosVariante {
  id: string;
  duracionMinutos: number;
  prepBufferMinutos: number;
}

export interface FranjaLaboral {
  apertura: string;
  cierre: string;
}

export interface Descanso {
  desdeHora: string;
  hastaHora: string;
}

export interface Ocupacion {
  desde: Date;
  hasta: Date;
}

export interface ParametrosDisponibilidad {
  /** Fecha local Lima "YYYY-MM-DD". */
  fecha: string;
  /** Día de la semana (0 = domingo … 6 = sábado). */
  weekday: number;
  /** Horario laboral del día; null/ausente = cerrado. */
  franja: FranjaLaboral | null;
  /** Descansos del día (p. ej. almuerzo). */
  descansos: Descanso[];
  /** Granularidad de slots en minutos. */
  pasoMinutos: number;
  /** Separación mínima entre citas. */
  gapMinutos: number;
  /** Antelación mínima para reservar (minutos desde ahora). */
  leadMinutos: number;
  /** Variante a agendar. */
  variante: DatosVariante;
  /** Ocupaciones activas (rangos UTC). */
  ocupaciones: Ocupacion[];
}

export interface Slot {
  inicioUtc: string;
  finUtc: string;
  etiqueta: string;
}

const OFFSET_LIMA = "-05:00";
const MS_POR_MINUTO = 60_000;

export function fechaHoraLimaADate(fecha: string, hhmm: string): Date {
  const [h, m] = hhmm.split(":");
  return new Date(`${fecha}T${h ?? "00"}:${m ?? "00"}:00${OFFSET_LIMA}`);
}

function minutosDe(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function hhmmDe(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function rangosSolapados(
  a: { desde: number; hasta: number },
  b: { desde: number; hasta: number },
): boolean {
  return a.desde < b.hasta && a.hasta > b.desde;
}

/**
 * Calcula los slots disponibles para una variante en una fecha.
 * Reglas: horario laboral, descansos, duración + prep, gap, ocupaciones
 * vigentes y antelación mínima. Sin acceso a datos: los insumos llegan listos.
 */
export function calcularSlots(parametros: ParametrosDisponibilidad): Slot[] {
  const { franja, variante, pasoMinutos, gapMinutos, leadMinutos } = parametros;
  if (!franja) return [];

  const apertura = minutosDe(franja.apertura);
  const cierre = minutosDe(franja.cierre);
  if (apertura >= cierre) return [];

  const duracionTotal =
    variante.duracionMinutos + variante.prepBufferMinutos;
  const ahora = Date.now();
  const slots: Slot[] = [];

  for (
    let minutos = apertura;
    minutos + duracionTotal <= cierre;
    minutos += pasoMinutos
  ) {
    const inicio = fechaHoraLimaADate(parametros.fecha, hhmmDe(minutos));
    const fin = new Date(inicio.getTime() + duracionTotal * MS_POR_MINUTO);

    const chocaDescanso = parametros.descansos.some((d) => {
      const dInicio = fechaHoraLimaADate(parametros.fecha, d.desdeHora);
      const dFin = fechaHoraLimaADate(parametros.fecha, d.hastaHora);
      return rangosSolapados(
        { desde: inicio.getTime(), hasta: fin.getTime() },
        { desde: dInicio.getTime(), hasta: dFin.getTime() },
      );
    });
    if (chocaDescanso) continue;

    const chocaOcupacion = parametros.ocupaciones.some((o) => {
      const margen = gapMinutos * MS_POR_MINUTO;
      return rangosSolapados(
        { desde: inicio.getTime(), hasta: fin.getTime() },
        { desde: o.desde.getTime() - margen, hasta: o.hasta.getTime() + margen },
      );
    });
    if (chocaOcupacion) continue;

    if (inicio.getTime() < ahora + leadMinutos * MS_POR_MINUTO) continue;

    slots.push({
      inicioUtc: inicio.toISOString(),
      finUtc: fin.toISOString(),
      etiqueta: hhmmDe(minutos),
    });
  }

  return slots;
}

/**
 * Valida (server-side, antes de la RPC) que un slot solicitado sigue
 * disponible con las mismas reglas del cálculo. La RPC revalida en la BD.
 */
export function slotSigueDisponible(
  slotUtc: string,
  parametros: ParametrosDisponibilidad,
): boolean {
  const inicio = new Date(slotUtc).getTime();
  if (Number.isNaN(inicio)) return false;

  const { franja, variante, gapMinutos, leadMinutos, ocupaciones } = parametros;
  if (!franja) return false;

  const duracionTotal =
    variante.duracionMinutos + variante.prepBufferMinutos;
  const fin = inicio + duracionTotal * MS_POR_MINUTO;

  const aperturaUtc = fechaHoraLimaADate(
    parametros.fecha,
    franja.apertura,
  ).getTime();
  const cierreUtc = fechaHoraLimaADate(
    parametros.fecha,
    franja.cierre,
  ).getTime();

  if (inicio < aperturaUtc || fin > cierreUtc) return false;

  const chocaDescanso = parametros.descansos.some((d) =>
    rangosSolapados(
      { desde: inicio, hasta: fin },
      {
        desde: fechaHoraLimaADate(parametros.fecha, d.desdeHora).getTime(),
        hasta: fechaHoraLimaADate(parametros.fecha, d.hastaHora).getTime(),
      },
    ),
  );
  if (chocaDescanso) return false;

  const chocaOcupacion = ocupaciones.some((o) =>
    rangosSolapados(
      { desde: inicio, hasta: fin },
      {
        desde: o.desde.getTime() - gapMinutos * MS_POR_MINUTO,
        hasta: o.hasta.getTime() + gapMinutos * MS_POR_MINUTO,
      },
    ),
  );
  if (chocaOcupacion) return false;

  return inicio >= Date.now() + leadMinutos * MS_POR_MINUTO;
}
