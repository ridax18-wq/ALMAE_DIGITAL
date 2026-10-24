import { describe, expect, it } from "vitest";
import {
  clasesTipoBloqueo,
  etiquetaTipoBloqueo,
  MAX_DIAS_BLOQUEO,
  textoDuracion,
  TIPOS_BLOQUEO,
  validarIntervaloBloqueo,
  vistaPreviaBloqueo,
} from "@/lib/services/bloqueos-agenda";

const dia = { fechaInicio: "2026-10-26", fechaFin: "2026-10-26" };

describe("tipos de bloqueo", () => {
  it("incluye los siete tipos solicitados con etiqueta en español", () => {
    expect(TIPOS_BLOQUEO.map((t) => t.etiqueta)).toEqual([
      "Descanso",
      "Almuerzo",
      "Ausencia",
      "Vacaciones",
      "Capacitación",
      "Mantenimiento",
      "Otros",
    ]);
  });

  it("etiqueta el tipo legado INTERNAL y cae a un color neutro para tipos desconocidos", () => {
    expect(etiquetaTipoBloqueo("INTERNAL")).toBe("Interno");
    expect(etiquetaTipoBloqueo("VACATION")).toBe("Vacaciones");
    expect(clasesTipoBloqueo("VACATION")).toContain("brand");
    expect(clasesTipoBloqueo("DESCONOCIDO")).toContain("dashed");
  });
});

describe("validarIntervaloBloqueo (America/Lima, -05:00)", () => {
  it("acepta un bloque de un día y expresa el inicio con offset de Lima", () => {
    const r = validarIntervaloBloqueo({ ...dia, horaInicio: "10:00", horaFin: "11:30" });
    expect(r).toEqual({
      ok: true,
      inicioIso: "2026-10-26T10:00:00-05:00",
      finIso: "2026-10-26T11:30:00-05:00",
      duracionMinutos: 90,
    });
  });

  it("convierte 10:00 Lima a 15:00 UTC", () => {
    const r = validarIntervaloBloqueo({ ...dia, horaInicio: "10:00", horaFin: "11:00" });
    if (!r.ok) throw new Error("debería ser válido");
    expect(new Date(r.inicioIso).toISOString()).toBe("2026-10-26T15:00:00.000Z");
  });

  it("acepta bloques de varios días", () => {
    const r = validarIntervaloBloqueo({
      fechaInicio: "2026-10-26",
      horaInicio: "09:00",
      fechaFin: "2026-10-28",
      horaFin: "18:00",
    });
    expect(r.ok && r.duracionMinutos).toBe(2 * 24 * 60 + 9 * 60);
  });

  it("rechaza hora final igual o anterior al inicio", () => {
    expect(validarIntervaloBloqueo({ ...dia, horaInicio: "10:00", horaFin: "10:00" }).ok).toBe(false);
    expect(validarIntervaloBloqueo({ ...dia, horaInicio: "12:00", horaFin: "11:00" }).ok).toBe(false);
  });

  it("rechaza fechas u horas con formato inválido o inexistentes", () => {
    expect(validarIntervaloBloqueo({ ...dia, horaInicio: "9:00", horaFin: "10:00" }).ok).toBe(false);
    expect(validarIntervaloBloqueo({ fechaInicio: "2026-13-01", fechaFin: "2026-13-01", horaInicio: "09:00", horaFin: "10:00" }).ok).toBe(false);
    expect(validarIntervaloBloqueo({ fechaInicio: "2026-02-30", fechaFin: "2026-02-30", horaInicio: "09:00", horaFin: "10:00" }).ok).toBe(false);
  });

  it("rechaza bloques que superan el máximo permitido", () => {
    const r = validarIntervaloBloqueo({
      fechaInicio: "2026-10-01",
      horaInicio: "09:00",
      fechaFin: "2026-10-01",
      horaFin: "10:00",
    });
    expect(r.ok).toBe(true);
    const fin = new Date(Date.UTC(2026, 0, 1 + MAX_DIAS_BLOQUEO + 1)).toISOString().slice(0, 10);
    const largo = validarIntervaloBloqueo({
      fechaInicio: "2026-01-01",
      horaInicio: "00:00",
      fechaFin: fin,
      horaFin: "00:00",
    });
    expect(largo).toEqual({ ok: false, error: `El bloqueo no puede durar más de ${MAX_DIAS_BLOQUEO} días` });
  });
});

describe("textos de vista previa", () => {
  it("formatea duraciones en horas, minutos y días", () => {
    expect(textoDuracion(90)).toBe("1 h 30 min");
    expect(textoDuracion(24 * 60)).toBe("1 día");
    expect(textoDuracion(2 * 24 * 60 + 60)).toBe("2 días 1 h");
  });

  it("describe el intervalo en español o devuelve null si no es válido", () => {
    expect(vistaPreviaBloqueo({ ...dia, horaInicio: "10:00", horaFin: "16:00" })).toBe(
      "Desde 26/10/2026 10:00 hasta 26/10/2026 16:00 (6 h)",
    );
    expect(vistaPreviaBloqueo({ ...dia, horaInicio: "16:00", horaFin: "10:00" })).toBeNull();
  });
});
