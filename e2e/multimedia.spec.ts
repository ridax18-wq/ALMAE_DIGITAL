import { expect, test } from "@playwright/test";

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

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

test.describe("HITO 3.2-B3 — biblioteca multimedia", () => {
  test("el anonimo no accede a la biblioteca", async ({ page }) => {
    await page.goto("/admin/multimedia");
    await page.waitForURL("**/admin/login**");
  });

  test("subida valida, texto alternativo, rechazos y borrado", async ({ page }) => {
    await login(page);
    await page.goto("/admin/multimedia");

    await page.setInputFiles('input[name="archivo"]', {
      name: "prueba-b3.png",
      mimeType: "image/png",
      buffer: PNG_1X1,
    });
    await page.fill('input[name="alt"]', "Imagen de prueba B3");
    await page.getByRole("button", { name: "Subir imagen" }).click();
    await expect(page.getByText("Imagen subida correctamente")).toBeVisible();
    await expect(page.locator("img[alt='Imagen de prueba B3']")).toBeVisible();

    await page.reload();
    await expect(page.locator("img[alt='Imagen de prueba B3']").first()).toBeVisible();

    const tarjeta = page.locator("article", { has: page.locator("img[alt='Imagen de prueba B3']") }).first();
    await tarjeta.locator('input[name="alt"]').fill("Imagen de prueba B3 editada");
    await tarjeta.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Texto alternativo guardado")).toBeVisible();
    await expect(page.locator("img[alt='Imagen de prueba B3 editada']").first()).toBeVisible();

    await page.setInputFiles('input[name="archivo"]', {
      name: "grande.png",
      mimeType: "image/png",
      buffer: Buffer.concat([PNG_1X1, Buffer.alloc(5 * 1024 * 1024)]),
    });
    await page.getByRole("button", { name: "Subir imagen" }).click();
    await expect(page.getByText(/supera el m.ximo de 5 MB/)).toBeVisible();

    await page.setInputFiles('input[name="archivo"]', {
      name: "notas.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("archivo de texto"),
    });
    await page.getByRole("button", { name: "Subir imagen" }).click();
    await expect(page.getByText(/Formato no permitido/)).toBeVisible();

    const tarjeta2 = page.locator("article", { has: page.locator("img[alt='Imagen de prueba B3 editada']") }).first();
    page.on("dialog", (dialog) => dialog.accept());
    await tarjeta2.getByRole("button", { name: "Eliminar" }).click();
    await expect(page.getByText("Imagen eliminada")).toBeVisible();
    await expect(page.locator("img[alt='Imagen de prueba B3 editada']")).toHaveCount(0);
  });
});
