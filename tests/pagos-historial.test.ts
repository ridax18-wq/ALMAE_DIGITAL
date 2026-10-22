import { describe, expect, it } from "vitest";
import {
  esEstadoPago,
  esMetodoPago,
  paginaValida,
  rangoFechaLima,
  sumarVerificados,
  totalPaginas,
} from "@/lib/services/pagos-historial";

describe("Historial de pagos — 3.2-A2", () => {
  it("solo los pagos VERIFIED suman como ingreso confirmado", () => {
    const total = sumarVerificados([
      { verification_status: "VERIFIED", amount_cents: 2000 },
      { verification_status: "REPORTED", amount_cents: 5000 },
      { verification_status: "REJECTED", amount_cents: 1000 },
    ]);
    expect(total).toBe(2000);
  });

  it("valida estado y método contra listas cerradas", () => {
    expect(esEstadoPago("VERIFIED")).toBe(true);
    expect(esEstadoPago("PAID")).toBe(false);
    expect(esMetodoPago("YAPE")).toBe(true);
    expect(esMetodoPago("'; drop")).toBe(false);
  });

  it("el rango de fechas se interpreta en America/Lima", () => {
    const r = rangoFechaLima("2026-10-01", "2026-10-31");
    expect(r.desdeIso).toBe("2026-10-01T00:00:00-05:00");
    expect(r.hastaIso).toBe("2026-10-31T23:59:59.999-05:00");
    expect(rangoFechaLima("no-fecha", undefined)).toEqual({ desdeIso: null, hastaIso: null });
  });

  it("la página es entera positiva y acotada", () => {
    expect(paginaValida("3")).toBe(3);
    expect(paginaValida("-2")).toBe(1);
    expect(paginaValida("abc")).toBe(1);
    expect(totalPaginas(0)).toBe(1);
    expect(totalPaginas(26)).toBe(2);
  });
});
