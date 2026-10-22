export type ClaseBandeja =
  | "PENDIENTE"
  | "PROXIMA_A_VENCER"
  | "CONFIRMADA"
  | "EXPIRADA"
  | "CANCELADA"
  | "OTRA";

export const UMBRAL_PROXIMA_MS = 5 * 60_000;

export function tiempoRestanteMs(vencimientoIso: string | null, ahoraMs: number): number {
  if (!vencimientoIso) return 0;
  return Math.max(0, new Date(vencimientoIso).getTime() - ahoraMs);
}

export function clasificarReserva(
  estado: string,
  vencimientoIso: string | null,
  ahoraMs: number,
): ClaseBandeja {
  if (estado === "CONFIRMED") return "CONFIRMADA";
  if (estado === "CANCELLED") return "CANCELADA";
  if (estado === "EXPIRED") return "EXPIRADA";
  if (estado !== "HELD") return "OTRA";
  const restante = tiempoRestanteMs(vencimientoIso, ahoraMs);
  if (restante <= 0) return "EXPIRADA";
  return restante <= UMBRAL_PROXIMA_MS ? "PROXIMA_A_VENCER" : "PENDIENTE";
}

export function puedeConfirmarse(clase: ClaseBandeja): boolean {
  return clase === "PENDIENTE" || clase === "PROXIMA_A_VENCER";
}

export function saldoPendienteCents(requeridoCents: number, verificadoCents: number): number {
  return Math.max(0, requeridoCents - verificadoCents);
}

export function formatearRestante(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const minutos = Math.floor(total / 60);
  const segundos = total % 60;
  return `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
}

export function ordenarPorVencimiento<T extends { vencimientoIso: string | null }>(filas: T[]): T[] {
  return [...filas].sort((a, b) => {
    const ta = a.vencimientoIso ? new Date(a.vencimientoIso).getTime() : Number.MAX_SAFE_INTEGER;
    const tb = b.vencimientoIso ? new Date(b.vencimientoIso).getTime() : Number.MAX_SAFE_INTEGER;
    return ta - tb;
  });
}
