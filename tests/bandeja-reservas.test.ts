import { describe, expect, it } from "vitest";
import {
  clasificarReserva,
  formatearRestante,
  ordenarPorVencimiento,
  puedeConfirmarse,
  saldoPendienteCents,
  tiempoRestanteMs,
} from "@/lib/services/bandeja-reservas";

const AHORA = Date.parse("2026-10-22T15:00:00Z");
const en = (min: number) => new Date(AHORA + min * 60_000).toISOString();

describe("Bandeja de reservas — 3.2-A1", () => {
  it("HELD vigente sin urgencia queda PENDIENTE y confirmable", () => {
    const clase = clasificarReserva("HELD", en(10), AHORA);
    expect(clase).toBe("PENDIENTE");
    expect(puedeConfirmarse(clase)).toBe(true);
  });

  it("HELD a menos de 5 minutos queda PROXIMA_A_VENCER y sigue confirmable", () => {
    const clase = clasificarReserva("HELD", en(3), AHORA);
    expect(clase).toBe("PROXIMA_A_VENCER");
    expect(puedeConfirmarse(clase)).toBe(true);
  });

  it("HELD vencida NO es confirmable aunque el estado diga HELD", () => {
    const clase = clasificarReserva("HELD", en(-1), AHORA);
    expect(clase).toBe("EXPIRADA");
    expect(puedeConfirmarse(clase)).toBe(false);
  });

  it("Estados CONFIRMED, EXPIRED y CANCELLED se clasifican sin ser confirmables", () => {
    expect(clasificarReserva("CONFIRMED", null, AHORA)).toBe("CONFIRMADA");
    expect(clasificarReserva("EXPIRED", null, AHORA)).toBe("EXPIRADA");
    expect(clasificarReserva("CANCELLED", null, AHORA)).toBe("CANCELADA");
    expect(puedeConfirmarse("CONFIRMADA")).toBe(false);
  });

  it("El tiempo restante sale del vencimiento del servidor y nunca es negativo", () => {
    expect(tiempoRestanteMs(en(2), AHORA)).toBe(2 * 60_000);
    expect(tiempoRestanteMs(en(-5), AHORA)).toBe(0);
    expect(tiempoRestanteMs(null, AHORA)).toBe(0);
  });

  it("Formatea el contador como MM:SS", () => {
    expect(formatearRestante(14 * 60_000 + 5_000)).toBe("14:05");
    expect(formatearRestante(0)).toBe("00:00");
  });

  it("El saldo cuenta solo lo verificado, nunca lo reportado", () => {
    expect(saldoPendienteCents(2000, 0)).toBe(2000);
    expect(saldoPendienteCents(2000, 2000)).toBe(0);
    expect(saldoPendienteCents(2000, 2500)).toBe(0);
  });

  it("Ordena por vencimiento más próximo y deja sin vencimiento al final", () => {
    const filas = ordenarPorVencimiento([
      { id: "a", vencimientoIso: en(12) },
      { id: "b", vencimientoIso: null },
      { id: "c", vencimientoIso: en(4) },
    ]);
    expect(filas.map((f) => f.id)).toEqual(["c", "a", "b"]);
  });
});
