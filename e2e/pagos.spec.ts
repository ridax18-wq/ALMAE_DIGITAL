import { expect, test } from "@playwright/test";
import {
  elegirHorarioEstable,
  encontrarDiaConHorarios,
  limpiarAgendaLocal,
} from "./utilidades";

async function reservarHastaCheckout(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/reservar");
  await page.getByRole("button", { name: /Terapia física/ }).first().click();
  expect(await encontrarDiaConHorarios(page)).toBe(true);
  await elegirHorarioEstable(page);
  await page.fill("#nombre", "Paciente Pagos E2E");
  await page.fill("#telefono", "912345678");
  await page.check('input[name="consent"]');
  await page.getByRole("button", { name: "Reservar mi horario" }).click();
  await page.waitForURL(/\/reserva\/[0-9a-f]{64}$/);
  await expect(page.locator("main").getByText("Horario reservado — pago pendiente")).toBeVisible();
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
    await expect(page.locator("main").getByText("Cita confirmada")).toBeVisible();
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
    await expect(page.locator("main").getByText("Reserva cancelada")).toBeVisible();
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
    await expect(page.locator("main").getByText("Cita confirmada")).toBeVisible();
  });
});
