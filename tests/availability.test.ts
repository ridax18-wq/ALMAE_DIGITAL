import { describe, expect, it } from "vitest";
import {
  calcularSlots,
  fechaHoraLimaADate,
  slotSigueDisponible,
  type ParametrosDisponibilidad,
} from "@/lib/services/availability";

function parametrosBase(
  overrides: Partial<ParametrosDisponibilidad> = {},
): ParametrosDisponibilidad {
  return {
    fecha: "2026-10-20",
    weekday: 2,
    franja: { apertura: "08:00", cierre: "20:00" },
    descansos: [],
    pasoMinutos: 15,
    gapMinutos: 15,
    leadMinutos: 180,
    variante: { id: "v1", duracionMinutos: 60, prepBufferMinutos: 0 },
    ocupaciones: [],
    ...overrides,
  };
}

describe("calcularSlots", () => {
  it("genera slots alineados al paso dentro del horario laboral", () => {
    const slots = calcularSlots(
      parametrosBase({ franja: { apertura: "09:00", cierre: "11:00" } }),
    );
    expect(slots.map((s) => s.etiqueta)).toEqual([
      "09:00",
      "09:15",
      "09:30",
      "09:45",
      "10:00",
    ]);
    expect(slots[0]?.inicioUtc).toBe("2026-10-20T14:00:00.000Z");
  });

  it("no genera slots cuando el día está cerrado", () => {
    expect(calcularSlots(parametrosBase({ franja: null }))).toEqual([]);
  });

  it("no genera slots que cruzan el descanso", () => {
    const slots = calcularSlots(
      parametrosBase({
        franja: { apertura: "08:00", cierre: "16:00" },
        descansos: [{ desdeHora: "13:00", hastaHora: "16:00" }],
      }),
    );
    const etiquetas = slots.map((s) => s.etiqueta);
    for (const prohibida of ["12:15", "12:30", "12:45", "13:00", "14:30", "15:00", "15:15"]) {
      expect(etiquetas).not.toContain(prohibida);
    }
    expect(etiquetas).toContain("12:00");
    expect(etiquetas).not.toContain("16:00");
  });

  it("respeta el gap alrededor de ocupaciones existentes", () => {
    const ocupada = fechaHoraLimaADate("2026-10-20", "10:00");
    const slots = calcularSlots(
      parametrosBase({
        franja: { apertura: "08:00", cierre: "12:00" },
        ocupaciones: [
          {
            desde: ocupada,
            hasta: new Date(ocupada.getTime() + 60 * 60_000),
          },
        ],
      }),
    );
    const etiquetas = slots.map((s) => s.etiqueta);
    for (const prohibida of ["09:00", "09:15", "10:00", "10:45"]) {
      expect(etiquetas).not.toContain(prohibida);
    }
    expect(etiquetas).toContain("08:45");
    expect(slots.map((s) => s.etiqueta)).toEqual(["08:00", "08:15", "08:30", "08:45"]);
  });

  it("la antelación mínima descarta slots demasiado próximos", () => {
    const futuro = new Date(Date.now() + 60 * 60_000);
    const fecha = futuro.toLocaleDateString("en-CA", {
      timeZone: "America/Lima",
    });
    const hhmm = futuro.toLocaleTimeString("en-GB", {
      timeZone: "America/Lima",
      hour: "2-digit",
      minute: "2-digit",
    });
    const slots = calcularSlots(
      parametrosBase({
        fecha,
        weekday: futuro.getDay(),
        franja: { apertura: "00:00", cierre: "23:59" },
        leadMinutos: 60,
      }),
    );
    expect(slots.find((s) => s.etiqueta === hhmm)).toBeUndefined();
  });

  it("convierte correctamente la hora Lima a UTC", () => {
    const inicio = fechaHoraLimaADate("2026-10-20", "23:30");
    expect(inicio.toISOString()).toBe("2026-10-21T04:30:00.000Z");
  });

  it("un slot debe caber completo en el horario laboral", () => {
    const slots = calcularSlots(
      parametrosBase({
        franja: { apertura: "09:00", cierre: "10:30" },
      }),
    );
    expect(slots.map((s) => s.etiqueta)).toEqual([
      "09:00",
      "09:15",
      "09:30",
    ]);
  });
});

describe("slotSigueDisponible", () => {
  it("rechaza slots fuera del horario laboral", () => {
    const slot = fechaHoraLimaADate("2026-10-20", "07:30");
    expect(
      slotSigueDisponible(slot.toISOString(), parametrosBase({ leadMinutos: 0 })),
    ).toBe(false);
  });

  it("rechaza slots en conflicto con ocupaciones con gap", () => {
    const ocupada = fechaHoraLimaADate("2026-10-20", "10:00");
    const slot = fechaHoraLimaADate("2026-10-20", "09:30");
    expect(
      slotSigueDisponible(
        slot.toISOString(),
        parametrosBase({
          leadMinutos: 0,
          ocupaciones: [
            {
              desde: ocupada,
              hasta: new Date(ocupada.getTime() + 60 * 60_000),
            },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("acepta un slot válido y desocupado dentro de la antelación", () => {
    const slot = fechaHoraLimaADate("2026-10-20", "09:00");
    expect(
      slotSigueDisponible(
        slot.toISOString(),
        parametrosBase({ leadMinutos: 0 }),
      ),
    ).toBe(slot.getTime() >= Date.now());
  });
});
