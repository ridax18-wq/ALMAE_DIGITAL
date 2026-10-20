import { expect, test } from "@playwright/test";
import {
  elegirHorarioEstable,
  encontrarDiaConHorarios,
  limpiarAgendaLocal,
} from "./utilidades";

test.describe("FASE 3 — motor de reservas", () => {
  test.beforeAll(async () => {
    await limpiarAgendaLocal();
  });

  test("flujo completo: servicio, horario, datos, hold y cancelación", async ({ page }) => {
    await page.goto("/reservar");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Reserva tu cita");

    await page.getByRole("button", { name: /Terapia física/ }).first().click();
    await expect(page.getByText("Paso 2 de 3")).toBeVisible();

    expect(
      await encontrarDiaConHorarios(page),
      "No se encontró un día con horarios en 5 intentos",
    ).toBe(true);

    await elegirHorarioEstable(page);
    await expect(page.getByText("Paso 3 de 3")).toBeVisible();

    await page.fill("#nombre", "Paciente Prueba E2E");
    await page.fill("#telefono", "987654321");
    await page.check('input[name="consent"]');
    await page.getByRole("button", { name: "Reservar mi horario" }).click();

    await page.waitForURL(/\/reserva\/[0-9a-f]{64}$/);
    await expect(
      page.locator("main").getByText("Horario separado — coordinando adelanto"),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Terapia física");

    await page.getByRole("button", { name: "Cancelar mi reserva" }).click();
    await expect(page.locator("main").getByText("Reserva cancelada")).toBeVisible();
  });
});
