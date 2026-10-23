import { describe, expect, it } from "vitest";
import {
  esRetencionExpirada,
  etiquetaOrigen,
  fechaLimaDeIso,
  horaDeMinutos,
  horaLimaDeIso,
  huecosLibres,
  minutosDeDuracion,
  minutosDeHora,
  weekdayDeFechaLima,
} from "@/lib/services/agenda-vista";

describe("agenda-vista — hora Lima", () => {
  it("convierte ISO timestamptz a fecha y hora Lima", () => {
    expect(fechaLimaDeIso("2026-10-23T23:00:00+00:00")).toBe("2026-10-23");
    expect(horaLimaDeIso("2026-10-23T23:00:00+00:00")).toBe("18:00");
    expect(horaLimaDeIso("2026-10-24T02:30:00+00:00")).toBe("21:30");
  });

  it("calcula duración en minutos entre dos ISO", () => {
    expect(minutosDeDuracion("2026-10-23T15:00:00+00:00", "2026-10-23T16:00:00+00:00")).toBe(60);
  });

  it("convierte horas y minutos de forma recíproca", () => {
    expect(minutosDeHora("08:30")).toBe(510);
    expect(horaDeMinutos(510)).toBe("08:30");
  });

  it("weekday de fecha Lima coincide con el calendario", () => {
    expect(weekdayDeFechaLima("2026-10-26")).toBe(1);
  });
});

describe("agenda-vista — retenciones expiradas", () => {
  const ahora = "2026-10-23T12:00:00+00:00";

  it("HELD vencida se considera expirada", () => {
    expect(esRetencionExpirada("HELD", "2026-10-23T11:00:00+00:00", ahora)).toBe(true);
  });

  it("HELD vigente no es expirada", () => {
    expect(esRetencionExpirada("HELD", "2026-10-23T13:00:00+00:00", ahora)).toBe(false);
  });

  it("CONFIRMED nunca es retención expirada", () => {
    expect(esRetencionExpirada("CONFIRMED", null, ahora)).toBe(false);
    expect(esRetencionExpirada("CONFIRMED", "2026-10-23T11:00:00+00:00", ahora)).toBe(false);
  });

  it("HELD sin ventana se trata como expirada", () => {
    expect(esRetencionExpirada("HELD", null, ahora)).toBe(true);
  });
});

describe("agenda-vista — huecos libres", () => {
  const franja = {
    apertura: "08:00",
    cierre: "20:00",
    descanso: { desde: "13:00", hasta: "16:00" },
  };

  it("día completo libre se divide por el descanso", () => {
    const huecos = huecosLibres(franja, []);
    expect(huecos).toEqual([
      { inicio: 480, fin: 780 },
      { inicio: 960, fin: 1200 },
    ]);
  });

  it("descuenta citas y bloqueos de los huecos", () => {
    const huecos = huecosLibres(franja, [
      { inicio: 480, fin: 540 },
      { inicio: 1020, fin: 1080 },
    ]);
    expect(huecos).toEqual([
      { inicio: 540, fin: 780 },
      { inicio: 960, fin: 1020 },
      { inicio: 1080, fin: 1200 },
    ]);
  });

  it("franja cerrada devuelve vacío", () => {
    expect(huecosLibres({ apertura: "08:00", cierre: "08:00" }, [])).toEqual([]);
  });

  it("respeta el mínimo de duración", () => {
    const huecos = huecosLibres(franja, [{ inicio: 1170, fin: 1200 }], 60);
    expect(huecos.every((h) => h.fin - h.inicio >= 60)).toBe(true);
  });
});

describe("agenda-vista — etiquetas", () => {
  it("etiqueta origen según datos reales", () => {
    expect(etiquetaOrigen("WEB")).toBe("Web");
    expect(etiquetaOrigen("IN_PERSON")).toBe("Presencial");
    expect(etiquetaOrigen("ADMIN")).toBe("Administración");
    expect(etiquetaOrigen("OTRO")).toBe("OTRO");
  });
});
