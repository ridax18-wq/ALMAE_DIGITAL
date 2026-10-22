import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/admin/login");
  const intento = async (): Promise<void> => {
    await page.fill("#email", "admin@almae.demo");
    await page.fill("#password", "DemoAlmae2026");
    await page.getByRole("button", { name: /Iniciar sesi/ }).click();
  };
  await intento();
  try {
    await page.waitForURL("**/admin", { timeout: 8000 });
  } catch {
    await intento();
    await page.waitForURL("**/admin");
  }
}

test.describe("HITO 3.2-B4 — servicios y promociones", () => {
  test("anon no accede a la administración de promociones", async ({ page }) => {
    await page.goto("/admin/promociones");
    await page.waitForURL("**/admin/login**");
  });

  test("servicio: cambiar imagen principal y modo en el catálogo", async ({ page }) => {
    await login(page);
    await page.goto("/admin/servicios");

    const primera = page.locator("a[href^='/admin/servicios/']").filter({ hasNotText: "Nuevo" }).first();
    await primera.click();
    await expect(page.getByRole("heading", { name: "Editar servicio" })).toBeVisible();

    const selectorImagen = page.locator("#image_media_id");
    const opciones = await selectorImagen.locator("option").count();
    expect(opciones).toBeGreaterThan(1);
    const valorImagen = await selectorImagen.locator("option").nth(1).getAttribute("value");
    await selectorImagen.selectOption(String(valorImagen));

    await page.locator("#catalog_mode").selectOption("consulta");
    await page.getByRole("button", { name: "Guardar servicio" }).click();
    await expect(page.getByText("Cambios guardados.")).toBeVisible();

    await page.reload();
    await expect(page.locator("#catalog_mode")).toHaveValue("consulta");

    await page.locator("#catalog_mode").selectOption("reservable");
    await page.getByRole("button", { name: "Guardar servicio" }).click();
    await expect(page.getByText("Cambios guardados.")).toBeVisible();
  });

  test("promoción: crear, publicar, pausar y verificar vencida", async ({ page }) => {
    await login(page);
    await page.goto("/admin/promociones");

    const code = `E2E-${Date.now()}`;
    await page.getByRole("link", { name: /Nueva promoci.n/ }).click();
    await page.fill("#code", code);
    await page.locator("#kind").selectOption("percent");
    await page.fill("#value", "20");
    await page.fill("#valid_from", "2026-01-01");
    await page.fill("#valid_to", "2026-12-31");
    await page.getByRole("button", { name: "Guardar promoción" }).click();
    await expect(page.getByText("Promoción guardada.")).toBeVisible();

    const tarjeta = page.locator("article", { has: page.getByRole("heading", { name: code }) });
    await expect(tarjeta).toBeVisible();
    await expect(tarjeta.getByText("Visible para el público")).toBeVisible();

    await tarjeta.getByRole("button", { name: "Pausar" }).click();
    await expect(
      page.locator("article", { has: page.getByRole("heading", { name: code }) }).getByText("pausada"),
    ).toBeVisible();
    await expect(
      page.locator("article", { has: page.getByRole("heading", { name: code }) }).getByText("No visible para el público"),
    ).toBeVisible();

    await page
      .locator("article", { has: page.getByRole("heading", { name: code }) })
      .getByRole("button", { name: "Activar" })
      .click();

    await page.getByRole("link", { name: /Nueva promoci.n/ }).click();
    const codeVencida = `E2EV-${Date.now()}`;
    await page.fill("#code", codeVencida);
    await page.locator("#kind").selectOption("fixed");
    await page.fill("#value", "15");
    await page.fill("#valid_from", "2020-01-01");
    await page.fill("#valid_to", "2020-12-31");
    await page.getByRole("button", { name: "Guardar promoción" }).click();
    await expect(page.getByText("Promoción guardada.")).toBeVisible();
    await expect(
      page.locator("article", { has: page.getByRole("heading", { name: codeVencida }) }).getByText("vencida"),
    ).toBeVisible();

    await page.goto("/promociones");
    await expect(page.locator("article", { has: page.getByRole("heading", { name: code }) })).toBeVisible();
    await expect(page.locator("article", { has: page.getByRole("heading", { name: codeVencida }) })).toHaveCount(0);
  });

  test("promoción: rechaza precio inconsistente", async ({ page }) => {
    await login(page);
    await page.goto("/admin/promociones/nueva");
    await page.fill("#code", `E2EX-${Date.now()}`);
    await page.fill("#value", "0");
    await page.getByRole("button", { name: "Guardar promoción" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
  });
});
