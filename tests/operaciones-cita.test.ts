import { describe, expect, it } from "vitest";
import { ETIQUETAS_ESTADO, TRANSICIONES_ADMIN } from "@/lib/services/estados";

const MATRIZ_SERVIDOR: Record<string, string[]> = {
  HELD: ["CONFIRMED", "EXPIRED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "NO_SHOW", "CANCELLED"],
};

describe("Hito 3.3-D — transiciones administrativas", () => {
  it("las transiciones ofrecidas por la UI son subconjunto de la matriz del servidor", () => {
    for (const [desde, opciones] of Object.entries(TRANSICIONES_ADMIN)) {
      const permitidas = MATRIZ_SERVIDOR[desde] ?? [];
      for (const opcion of opciones) {
        expect(permitidas).toContain(opcion.a);
      }
    }
  });

  it("desde CONFIRMED permite asistencia, inasistencia y cancelacion", () => {
    const destinos = (TRANSICIONES_ADMIN.CONFIRMED ?? []).map((o) => o.a).sort();
    expect(destinos).toEqual(["CANCELLED", "COMPLETED", "NO_SHOW"]);
  });

  it("no ofrece retroceso desde estados finales", () => {
    expect(TRANSICIONES_ADMIN.COMPLETED).toBeUndefined();
    expect(TRANSICIONES_ADMIN.NO_SHOW).toBeUndefined();
    expect(TRANSICIONES_ADMIN.CANCELLED).toBeUndefined();
  });

  it("cubre etiquetas para los estados operativos", () => {
    for (const estado of ["HELD", "CONFIRMED", "COMPLETED", "CANCELLED", "EXPIRED", "NO_SHOW"]) {
      expect(ETIQUETAS_ESTADO[estado]?.texto).toBeTruthy();
    }
  });
});
