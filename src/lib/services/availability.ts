export interface DatosVariante {
  id: string;
  duracionMinutos: number;
  prepBufferMinutos: number;
}

export interface Descanso {
  desdeHora: string;
  hastaHora: string;
}

/** Una ventana de atención del día, con sus propios descansos. */
export interface FranjaDia {
  apertura: string;
  cierre: string;
  descansos: Descanso[];
}

export interface Ocupacion {
  desde: Date;
  hasta: Date;
}

export interface ParametrosDisponibilidad {
  /** Fecha local Lima "YYYY-MM-DD". */
  fecha: string;
  /** Día de la semana JS (0 = domingo … 6 = sábado). */
  weekday: number;
  /** Ventanas de atención del día; vacío = cerrado. */
  franjas: FranjaDia[];
  /** Granularidad de slots en minutos. */
  pasoMinutos: number;
  /** Separación mínima entre citas. */
  gapMinutos: number;
  /** Antelación mínima para reservar (minutos desde ahora). */
  leadMinutos: number;
  /** Variante a agendar. */
  variante: DatosVariante;
  /** Ocupaciones activas (citas + retenciones + bloqueos) en rangos UTC. */
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
 * Reglas: ventanas laborales (con varios bloques), descansos, duración + prep,
 * gap, ocupaciones vigentes y antelación mínima. Sin acceso a datos.
 */
export function calcularSlots(parametros: ParametrosDisponibilidad): Slot[] {
  const { franjas, variante, pasoMinutos, gapMinutos, leadMinutos } = parametros;

  const duracionTotal = variante.duracionMinutos + variante.prepBufferMinutos;
  const ahora = Date.now();
  const slots: Slot[] = [];

  for (const franja of franjas) {
    const apertura = minutosDe(franja.apertura);
    const cierre = minutosDe(franja.cierre);
    if (apertura >= cierre) continue;

    for (
      let minutos = apertura;
      minutos + duracionTotal <= cierre;
      minutos += pasoMinutos
    ) {
      const inicio = fechaHoraLimaADate(parametros.fecha, hhmmDe(minutos));
      const fin = new Date(inicio.getTime() + duracionTotal * MS_POR_MINUTO);

      const chocaDescanso = franja.descansos.some((d) =>
        rangosSolapados(
          { desde: inicio.getTime(), hasta: fin.getTime() },
          {
            desde: fechaHoraLimaADate(parametros.fecha, d.desdeHora).getTime(),
            hasta: fechaHoraLimaADate(parametros.fecha, d.hastaHora).getTime(),
          },
        ),
      );
      if (chocaDescanso) continue;

      const chocaOcupacion = parametros.ocupaciones.some((o) =>
        rangosSolapados(
          { desde: inicio.getTime(), hasta: fin.getTime() },
          {
            desde: o.desde.getTime() - gapMinutos * MS_POR_MINUTO,
            hasta: o.hasta.getTime() + gapMinutos * MS_POR_MINUTO,
          },
        ),
      );
      if (chocaOcupacion) continue;

      if (inicio.getTime() < ahora + leadMinutos * MS_POR_MINUTO) continue;

      slots.push({
        inicioUtc: inicio.toISOString(),
        finUtc: fin.toISOString(),
        etiqueta: hhmmDe(minutos),
      });
    }
  }

  return slots;
}

/**
 * Valida (server-side) que un slot solicitado sigue disponible con las
 * mismas reglas del cálculo. La RPC revalida en la base de datos.
 */
export function slotSigueDisponible(
  slotUtc: string,
  parametros: ParametrosDisponibilidad,
): boolean {
  const inicio = new Date(slotUtc).getTime();
  if (Number.isNaN(inicio)) return false;

  const { franjas, variante, gapMinutos, leadMinutos, ocupaciones } = parametros;

  const duracionTotal = variante.duracionMinutos + variante.prepBufferMinutos;
  const fin = inicio + duracionTotal * MS_POR_MINUTO;

  const dentroDeAlgunaVentana = franjas.some((franja) => {
    const aperturaUtc = fechaHoraLimaADate(parametros.fecha, franja.apertura).getTime();
    const cierreUtc = fechaHoraLimaADate(parametros.fecha, franja.cierre).getTime();
    if (inicio < aperturaUtc || fin > cierreUtc) return false;

    const chocaDescanso = franja.descansos.some((d) =>
      rangosSolapados(
        { desde: inicio, hasta: fin },
        {
          desde: fechaHoraLimaADate(parametros.fecha, d.desdeHora).getTime(),
          hasta: fechaHoraLimaADate(parametros.fecha, d.hastaHora).getTime(),
        },
      ),
    );
    return !chocaDescanso;
  });

  if (!dentroDeAlgunaVentana) return false;

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
