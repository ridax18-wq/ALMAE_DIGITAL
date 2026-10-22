export const ESTADOS_PAGO = ["REPORTED", "VERIFIED", "REJECTED"] as const;
export const METODOS_PAGO = ["YAPE", "PLIN", "BANK_TRANSFER", "CASH", "OTHER"] as const;
export const TAMANO_PAGINA = 25;

export type EstadoPago = (typeof ESTADOS_PAGO)[number];
export type MetodoPago = (typeof METODOS_PAGO)[number];

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function esEstadoPago(valor: string | undefined): valor is EstadoPago {
  return ESTADOS_PAGO.includes(valor as EstadoPago);
}

export function esMetodoPago(valor: string | undefined): valor is MetodoPago {
  return METODOS_PAGO.includes(valor as MetodoPago);
}

export function paginaValida(valor: string | undefined): number {
  const n = Number.parseInt(valor ?? "1", 10);
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 10_000) : 1;
}

/** Rango de created_at para un día calendario de Lima (America/Lima = UTC-05:00, sin DST). */
export function rangoFechaLima(desde?: string, hasta?: string): { desdeIso: string | null; hastaIso: string | null } {
  const valido = (f?: string) => (f && FECHA.test(f) ? f : null);
  const d = valido(desde);
  const h = valido(hasta);
  return {
    desdeIso: d ? `${d}T00:00:00-05:00` : null,
    hastaIso: h ? `${h}T23:59:59.999-05:00` : null,
  };
}

export function sumarVerificados(filas: { verification_status: string; amount_cents: number }[]): number {
  return filas.reduce(
    (total, f) => (f.verification_status === "VERIFIED" ? total + Number(f.amount_cents) : total),
    0,
  );
}

export function totalPaginas(total: number): number {
  return Math.max(1, Math.ceil(total / TAMANO_PAGINA));
}
