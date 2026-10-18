import { expect, test } from "@playwright/test";
import { limpiarAgendaLocal } from "./utilidades";

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

async function reservarHastaCheckout(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/reservar");
  await page.getByRole("button", { name: /Terapia física/ }).first().click();
  expect(await encontrarDiaConHorarios(page)).toBe(true);
  const chips = page.locator("fieldset button");
  const chipEstable = chips.filter({ hasText: "18:00" });
  if ((await chipEstable.count()) > 0) {
    await chipEstable.first().click();
  } else {
    await chips.last().click();
  }
  await page.fill("#nombre", "Paciente Pagos E2E");
  await page.fill("#telefono", "912345678");
  await page.check('input[name="consent"]');
  await page.getByRole("button", { name: "Reservar mi horario" }).click();
  await page.waitForURL(/\/reserva\/[0-9a-f]{64}$/);
  await expect(page.getByText("Horario reservado — pago pendiente")).toBeVisible();
  await page.getByRole("button", { name: /Pagar adelanto/ }).click();
  await page.waitForURL(/\/pagos\/checkout\//);
}

test.describe("FASE 4 — adelantos simulados", () => {
  test.beforeAll(async () => {
    await limpiarAgendaLocal();
  });
  test("pago aprobado confirma la cita", async ({ page }) => {
    await reservarHastaCheckout(page);
    await expect(page.getByText("SIMULADOR DE PAGO")).toBeVisible();
    await page.getByRole("button", { name: "Aprobar pago (simulado)" }).click();
    await page.waitForURL(/\/pagos\/resultado\//);
    await expect(
      page.getByRole("heading", { name: "¡Pago aprobado y cita confirmada!" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Ver mi reserva" }).click();
    await page.waitForURL(/\/reserva\/[0-9a-f]{64}$/);
    await expect(
      page.locator("main").getByText("Cita confirmada"),
    ).toBeVisible();
  });

  test("pago rechazado no confirma la cita", async ({ page }) => {
    await reservarHastaCheckout(page);
    await page.getByRole("button", { name: "Rechazar pago (simulado)" }).click();
    await page.waitForURL(/\/pagos\/resultado\//);
    await expect(
      page.getByRole("heading", { name: "El pago no se acreditó" }),
    ).toBeVisible();
    await expect(page.locator("main").getByText(/no fue confirmada/)).toBeVisible();

    await page.getByRole("link", { name: "Volver a mi reserva" }).click();
    await page.waitForURL(/\/reserva\/[0-9a-f]{64}$/);
    await expect(
      page.locator("main").getByText("Reserva cancelada"),
    ).toBeVisible();
  });

  test("webhook duplicado confirma una sola vez", async ({ page }) => {
    await reservarHastaCheckout(page);
    await page
      .getByRole("button", { name: "Enviar webhook duplicado (probar idempotencia)" })
      .click();
    await page.waitForURL(/\/pagos\/resultado\//);
    await expect(
      page.getByRole("heading", { name: "¡Pago aprobado y cita confirmada!" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Ver mi reserva" }).click();
    await page.waitForURL(/\/reserva\/[0-9a-f]{64}$/);
    await expect(
      page.locator("main").getByText("Cita confirmada"),
    ).toBeVisible();
  });
});
