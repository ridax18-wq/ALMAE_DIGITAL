import { expect, test } from "@playwright/test";
import { supabasePruebas } from "./utilidades";

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

test.describe("HITO 3.2-B6 — historial, restauración y banner", () => {
  test("el banner de entorno de prueba no aparece en el build de producción", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Entorno de prueba ALMAE/)).toHaveCount(0);
  });

  test("anon no accede al historial de versiones", async ({ page }) => {
    await page.goto("/admin/revisiones");
    await page.waitForURL("**/admin/login**");
  });

  test("historial: publicar un bloque genera revisión, comparar y restaurar", async ({ page }) => {
    await login(page);

    const marcador1 = `B6 E2E v1 ${Date.now()}`;
    const marcador2 = `B6 E2E v2 ${Date.now()}`;

    await page.goto("/admin/contenidos/footer_intro");
    await page.getByLabel("Texto").fill(marcador1);
    await page.getByRole("button", { name: "Publicar cambios" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Publicado" })).toBeVisible();

    await page.goto("/admin/contenidos/footer_intro");
    await page.getByLabel("Texto").fill(marcador2);
    await page.getByRole("button", { name: "Publicar cambios" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Publicado" })).toBeVisible();

    await page.goto("/admin/revisiones");
    await expect(page.getByText("Bloque: footer_intro").first()).toBeVisible();

    await page
      .locator("li", { hasText: "Bloque: footer_intro" })
      .first()
      .getByRole("link", { name: "Ver versión" })
      .click();

    await expect(page.getByRole("heading", { name: "Contenido de esta versión" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Comparación con la versión anterior" })).toBeVisible();
    await expect(page.getByText(marcador2).first()).toBeVisible();
    await expect(page.getByText(marcador1).first()).toBeVisible();

    await page.locator('input[name="confirmar"]').check();
    await page.getByRole("button", { name: "Restaurar versión" }).click();
    await expect(page.getByText("Versión restaurada.")).toBeVisible();

    await page.goto("/admin/revisiones");
    const filas = page.locator("li", { hasText: "Bloque: footer_intro" });
    expect(await filas.count()).toBeGreaterThanOrEqual(3);
  });
});

test.afterAll(async () => {
  const supabase = supabasePruebas();
  const { data: bloque } = await supabase
    .from("content_blocks")
    .select("id")
    .eq("block_key", "footer_intro")
    .maybeSingle();
  if (bloque) {
    await supabase.from("content_blocks").update({
      body: {
        text: "Fisioterapia, rehabilitación y bienestar. Atención presencial con un profesional dedicado en Lima.",
      },
    }).eq("id", bloque.id);
  }
  await supabase.from("content_revisions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
});
