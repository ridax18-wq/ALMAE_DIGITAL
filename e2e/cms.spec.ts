import { expect, test } from "@playwright/test";

const TITULO_ORIGINAL = "Tu bienestar comienza con el movimiento";
const PREGUNTA_ORIGINAL = "Necesito una orden m\u00e9dica para empezar?";

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

async function esperarPublicado(page: import("@playwright/test").Page): Promise<void> {
  await expect(page.getByRole("status").filter({ hasText: "Publicado" })).toBeVisible();
}

async function verHasta(page: import("@playwright/test").Page, esperado: string): Promise<void> {
  for (let intento = 0; intento < 12; intento += 1) {
    await page.goto("/");
    const h1 = await page.locator("h1").innerText();
    if (h1.includes(esperado)) return;
    await page.waitForTimeout(1000);
  }
  await expect(page.locator("h1")).toContainText(esperado);
}

test.describe("HITO 3.2-B2 — editor de contenidos", () => {
  test("el anonimo no accede al editor y el publico no ve borradores", async ({ page }) => {
    await page.goto("/admin/contenidos");
    await page.waitForURL("**/admin/login**");

    await login(page);
    await page.goto("/admin/contenidos/hero_home");

    const marcador = "PRUEBA-B2-BORRADOR-NO-PUBLICO";
    await page.getByLabel(/T.tulo principal/).fill(marcador);
    await page.getByRole("button", { name: "Guardar borrador" }).click();
    await expect(page.getByText("Borrador guardado")).toBeVisible();

    await page.goto("/");
    await expect(page.locator("h1")).not.toContainText(marcador);

    await page.goto("/admin/contenidos");
    await expect(page.getByText("Borrador (no visible)")).toBeVisible();
  });

  test("publicar refleja el cambio en el sitio publico y persiste", async ({ page }) => {
    await login(page);
    await page.goto("/admin/contenidos/hero_home");

    const marcador = "PRUEBA-B2-PUBLICADO";
    await page.getByLabel(/T.tulo principal/).fill(marcador);
    await page.getByRole("button", { name: "Publicar cambios" }).click();
    await esperarPublicado(page);

    await verHasta(page, marcador);
    await page.reload();
    await expect(page.locator("h1")).toContainText(marcador);

    await page.goto("/admin/contenidos/hero_home");
    await page.getByLabel(/T.tulo principal/).fill(TITULO_ORIGINAL);
    await page.getByRole("button", { name: "Publicar cambios" }).click();
    await esperarPublicado(page);
    await verHasta(page, TITULO_ORIGINAL);
  });

  test("editar una pregunta de la FAQ y restaurar", async ({ page }) => {
    await login(page);
    await page.goto("/admin/contenidos/faq_section");

    const marcador = "Pregunta de prueba B2?";

    await page.getByLabel("Pregunta 1").fill(marcador);
    await page.getByRole("button", { name: "Publicar cambios" }).click();
    await esperarPublicado(page);

    for (let intento = 0; intento < 12; intento += 1) {
      await page.goto("/");
      if (await page.getByText(marcador).isVisible().catch(() => false)) break;
      await page.waitForTimeout(1000);
    }
    await expect(page.getByText(marcador)).toBeVisible();

    await page.goto("/admin/contenidos/faq_section");
    await page.getByLabel("Pregunta 1").fill("\u00bf" + PREGUNTA_ORIGINAL);
    await page.getByRole("button", { name: "Publicar cambios" }).click();
    await esperarPublicado(page);
    for (let intento = 0; intento < 12; intento += 1) {
      await page.goto("/");
      if (await page.getByText(PREGUNTA_ORIGINAL).isVisible().catch(() => false)) break;
      await page.waitForTimeout(1000);
    }
    await expect(page.getByText(PREGUNTA_ORIGINAL)).toBeVisible();
  });

  test("la vista previa muestra el borrador en escritorio y movil", async ({ page }) => {
    await login(page);
    await page.goto("/admin/contenidos/hero_home/vista-previa");
    await expect(page.getByRole("heading", { name: /Vista previa/ })).toBeVisible();
    await page.getByRole("button", { name: /M.vil/ }).click();
    await expect(page.getByRole("button", { name: /M.vil/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(TITULO_ORIGINAL)).toBeVisible();
  });
});
