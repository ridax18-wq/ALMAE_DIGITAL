import { expect, test } from "@playwright/test";
import {
  elegirHorarioEstable,
  encontrarDiaConHorarios,
  limpiarAgendaLocal,
} from "./utilidades";

const SECCIONES = [
  { nombre: "Agenda", url: /\/admin\/agenda/ },
  { nombre: "Reservas", url: /\/admin\/reservas$/ },
  { nombre: "Pacientes", url: /\/admin\/pacientes$/ },
  { nombre: "Servicios", url: /\/admin\/servicios$/ },
  { nombre: "Horarios", url: /\/admin\/horarios$/ },
  { nombre: "Pagos", url: /\/admin\/pagos$/ },
  { nombre: "Reportes", url: /\/admin\/reportes$/ },
  { nombre: "Configuración", url: /\/admin\/configuracion/ },
];

async function entrarComoOwner(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/admin/login");
  await page.fill("#email", "admin@almae.demo");
  await page.fill("#password", "DemoAlmae2026");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL("**/admin");
}

test.describe("FASE 6 — panel administrativo", () => {
  test.beforeAll(async () => {
    await limpiarAgendaLocal();
  });

  test("recorrido completo por las secciones del panel", async ({ page }) => {
    await entrarComoOwner(page);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Secciones del panel" });

    for (const seccion of SECCIONES) {
      await nav.getByRole("link", { name: seccion.nombre, exact: true }).click();
      await expect(page).toHaveURL(seccion.url);
      await expect(page.locator("main").first()).toBeVisible();
    }
  });

async function reservarHastaToken(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/reservar");
  await page.getByRole("button", { name: /Terapia física/ }).first().click();
  expect(await encontrarDiaConHorarios(page)).toBe(true);
  await elegirHorarioEstable(page);
  await page.fill("#nombre", "Paciente Admin E2E");
  await page.fill("#telefono", "988776655");
  await page.check('input[name="consent"]');
  await page.getByRole("button", { name: "Reservar mi horario" }).click();
  await page.waitForURL(/\/reserva\/[0-9a-f]{64}$/);
  await expect(page.locator("main").getByText("Horario separado — coordinando adelanto")).toBeVisible();
}

  test("un pago manual confirma la reserva del paciente", async ({ page }) => {
    await reservarHastaToken(page);

    await entrarComoOwner(page);
    await page.getByRole("link", { name: "Reservas", exact: true }).click();
    await page.getByRole("link", { name: /Paciente Admin E2E/ }).first().click();
    await expect(page.getByRole("heading", { name: "Cambiar estado" })).toBeVisible();

    await page.fill("#monto", "20");
    await page.selectOption("#metodo", "yape");
    await page.getByRole("button", { name: "Registrar pago" }).click();

    await expect(page.locator("main").getByText("Cita confirmada")).toBeVisible();
    await expect(page.locator("main").getByText(/manual · yape/)).toBeVisible();
  });

  test("crear un servicio nuevo lo publica en el catálogo", async ({ page }) => {
    await entrarComoOwner(page);
    await page.goto("/admin/servicios/nuevo");
    await page.fill("#name", "Terapia de prueba E2E");
    await page.fill("#slug", "terapia-prueba-e2e");
    await page.fill("#sort_order", "90");
    await page.fill("#v_0_duration", "45");
    await page.fill("#v_0_price", "60");
    await page.getByRole("button", { name: "Guardar servicio" }).click();
    await page.waitForURL(/\/admin\/servicios\/[0-9a-f-]{36}\?guardado=1$/);
    await expect(page.getByText("Cambios guardados.")).toBeVisible();

    await page.goto("/servicios");
    await expect(page.getByText("Terapia de prueba E2E")).toBeVisible();
  });
});
