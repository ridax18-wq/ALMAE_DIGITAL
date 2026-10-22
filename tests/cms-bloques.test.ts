import { describe, expect, it } from "vitest";
import {
  BLOQUES,
  cuerpoDefecto,
  esquemas,
  limpiarTexto,
  validarCuerpo,
} from "@/lib/cms/bloques";

describe("CMS contenidos — 3.2-B2", () => {
  it("todos los bloques tienen defectos válidos y campos únicos", () => {
    for (const bloque of BLOQUES) {
      expect(() => cuerpoDefecto(bloque.clave)).not.toThrow();
      const nombres = bloque.campos.map((c) => c.nombre);
      expect(new Set(nombres).size).toBe(nombres.length);
    }
  });

  it("limpia HTML, scripts y caracteres de control", () => {
    const sucio = '<script>alert(1)</script>hola<>mundo';
    expect(limpiarTexto(sucio, 100)).toBe("scriptalert(1)/scriptholamundo");
    expect(limpiarTexto(`buen texto${String.fromCharCode(0)}x`, 100)).toBe("buen textox");
    expect(limpiarTexto("x".repeat(50), 10)).toHaveLength(10);
  });

  it("rechaza cuerpos con campos faltantes o tipos inválidos", () => {
    expect(esquemas.hero_home.safeParse({ title: "solo título" }).success).toBe(false);
    expect(esquemas.servicios_intro.safeParse({ title: 123 }).success).toBe(false);
    expect(esquemas.faq_section.safeParse({ eyebrow: "x", title: "y", items: [] }).success).toBe(false);
  });

  it("validarCuerpo recorta y sanea entradas válidas", () => {
    const cuerpo = validarCuerpo("servicios_intro", {
      title: `<b>Servicios</b>`,
      description: "Descripción <img src=x onerror=alert(1)> segura",
    });
    expect(cuerpo.title).toBe("bServicios/b");
    expect(cuerpo.description).not.toContain("<");
  });

  it("el bloque faq por defecto replica las preguntas del sitio", () => {
    const faq = cuerpoDefecto("faq_section");
    expect(faq.items.length).toBeGreaterThanOrEqual(5);
    expect(faq.items[0]?.question).toContain("orden médica");
  });
});
