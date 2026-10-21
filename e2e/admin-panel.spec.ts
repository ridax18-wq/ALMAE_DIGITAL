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
  const intento = async (): Promise<void> => {
    await page.fill("#email", "admin@almae.demo");
    await page.fill("#password", "DemoAlmae2026");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
  };
  await intento();
  try {
    await page.waitForURL("**/admin", { timeout: 8000 });
  } catch {
    await intento();
    await page.waitForURL("**/admin");
  }
}

async function reservarHastaToken(page: import("@playwright/test").Page): Promise<string> {
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
  return page.url();
}

test.describe("FASE 6 — panel administrativo", () => {
  test.beforeAll(async () => {
    await limpiarAgendaLocal();
  });

  test("recorrido completo por las secciones del panel", async ({ page }) => {
    await entrarComoOwner(page);
    await expect(page.getByRole("heading", { name: "Panel de control" })).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Secciones del panel" });

    for (const seccion of SECCIONES) {
      await nav.getByRole("link", { name: seccion.nombre, exact: true }).click();
      await expect(page).toHaveURL(seccion.url);
      await expect(page.locator("main").first()).toBeVisible();
    }
  });

  test("un adelanto verificado permite confirmar la reserva", async ({ page }) => {
    const urlToken = await reservarHastaToken(page);

    await entrarComoOwner(page);
    await page.getByRole("link", { name: "Reservas", exact: true }).click();
    const filaPropia = page.locator("tbody tr").filter({ hasText: "Paciente Admin E2E" }).first();
    await filaPropia.getByRole("link", { name: "Ver", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Registrar adelanto manual" })).toBeVisible();

    await page.selectOption('select[name="method"]', "YAPE");
    await page.fill('input[name="monto"]', "20");
    await page.fill('input[name="referencia"]', "E2E-0001");
    await page.getByRole("button", { name: "Registrar (queda REPORTED)" }).click();
    await expect(page.getByText("E2E-0001")).toBeVisible();

    await page.getByRole("button", { name: "Verificar" }).click();
    await expect(page.locator("main").getByText("VERIFIED")).toBeVisible();

    await expect(page.getByRole("button", { name: "Confirmar cita" })).toBeEnabled();
    await page.getByRole("button", { name: "Confirmar cita" }).click();
    await expect(page.getByText("Cita confirmada correctamente.")).toBeVisible();

    await page.goto(urlToken);
    await expect(page.locator("main").getByText("Cita confirmada")).toBeVisible();
  });

  test("crear un servicio nuevo queda guardado en el panel", async ({ page }) => {
    await entrarComoOwner(page);
    await page.goto("/admin/servicios/nuevo");
    const sufijo = Date.now();
    const nombreUnico = `Terapia de prueba E2E ${sufijo}`;
    await page.fill("#name", nombreUnico);
    await page.fill("#slug", `terapia-prueba-e2e-${sufijo}`);
    await page.fill("#sort_order", "90");
    await page.fill("#v_0_duration", "45");
    await page.fill("#v_0_price", "60");
    await page.getByRole("button", { name: "Guardar servicio" }).click();
    await page.waitForURL(/\/admin\/servicios\/[0-9a-f-]{36}\?guardado=1$/);
    await expect(page.getByText("Cambios guardados.")).toBeVisible();

    await page.goto("/admin/servicios");
    await expect(page.getByText(nombreUnico)).toBeVisible();
  });
});
