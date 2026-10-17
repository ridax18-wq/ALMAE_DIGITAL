import { expect, test } from "@playwright/test";

async function encontrarDiaConHorarios(page: import("@playwright/test").Page): Promise<boolean> {
  for (let desplazamiento = 0; desplazamiento < 5; desplazamiento += 1) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + desplazamiento);
    const iso = fecha.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
    await page.fill("#fecha", iso);
    await page.getByRole("button", { name: "Ver horarios" }).click();
    await page.waitForTimeout(700);
    if (await page.locator("fieldset button").count() > 0) return true;
  }
  return false;
}

test.describe("FASE 3 — motor de reservas", () => {
  test("flujo completo: servicio, horario, datos, hold y cancelación", async ({ page }) => {
    await page.goto("/reservar");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Reserva tu cita");

    await page.getByRole("button", { name: /Terapia física/ }).first().click();
    await expect(page.getByText("Paso 2 de 3")).toBeVisible();

    const conHorarios = await encontrarDiaConHorarios(page);
    expect(conHorarios, "No se encontró un día con horarios en 5 intentos").toBe(true);

    await page.locator("fieldset button").first().click();
    await expect(page.getByText("Paso 3 de 3")).toBeVisible();

    await page.fill("#nombre", "Paciente Prueba E2E");
    await page.fill("#telefono", "987654321");
    await page.check('input[name="consent"]');
    await page.getByRole("button", { name: "Reservar mi horario" }).click();

    await page.waitForURL(/\/reserva\/[0-9a-f]{64}$/);
    await expect(page.getByText("Horario reservado — pago pendiente")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Terapia física");

    await page.getByRole("button", { name: "Cancelar mi reserva" }).click();
    await expect(page.getByText("Reserva cancelada")).toBeVisible();
  });
});
