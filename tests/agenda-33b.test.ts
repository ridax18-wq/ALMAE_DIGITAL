import { describe, expect, it } from "vitest";
import {
  etiquetaOrigen,
  mensajeConfirmacionCita,
  ORIGENES_ADMIN,
} from "@/lib/services/agenda-vista";

describe("agenda-33b — orígenes de citas administrativas", () => {
  it("etiqueta los tres orígenes admin y el web", () => {
    expect(etiquetaOrigen("IN_PERSON")).toBe("Presencial");
    expect(etiquetaOrigen("WHATSAPP")).toBe("WhatsApp");
    expect(etiquetaOrigen("PHONE")).toBe("Teléfono");
    expect(etiquetaOrigen("WEB")).toBe("Web");
  });

  it("expone los orígenes permitidos para el formulario", () => {
    expect(ORIGENES_ADMIN).toEqual(["IN_PERSON", "WHATSAPP", "PHONE"]);
  });
});

describe("agenda-33b — mensaje de confirmación WhatsApp", () => {
  it("incluye servicio, fecha, hora, dirección y código", () => {
    const mensaje = mensajeConfirmacionCita({
      servicio: "Terapia física",
      fechaLima: "lunes, 26/10/2026",
      horaLima: "10:00",
      codigo: "ALM-ABC123",
      direccion: "Altos del Rímac 250, Rímac, Lima",
    });
    expect(mensaje).toContain("Terapia física");
    expect(mensaje).toContain("lunes, 26/10/2026");
    expect(mensaje).toContain("10:00");
    expect(mensaje).toContain("Altos del Rímac 250");
    expect(mensaje).toContain("ALM-ABC123");
  });

  it("omite la dirección si está vacía", () => {
    const mensaje = mensajeConfirmacionCita({
      servicio: "Masaje",
      fechaLima: "martes, 27/10/2026",
      horaLima: "18:00",
      codigo: "ALM-XYZ789",
      direccion: "",
    });
    expect(mensaje).not.toContain(" en ");
    expect(mensaje).toContain("ALM-XYZ789");
  });

  it("no incluye datos clínicos ni teléfono del paciente", () => {
    const mensaje = mensajeConfirmacionCita({
      servicio: "Terapia física",
      fechaLima: "lunes, 26/10/2026",
      horaLima: "10:00",
      codigo: "ALM-ABC123",
      direccion: "Rímac",
    });
    expect(mensaje).not.toMatch(/\d{9}/);
  });
});
