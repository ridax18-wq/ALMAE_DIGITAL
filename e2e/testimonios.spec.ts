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

test.describe("HITO 3.2-B5 — testimonios con consentimiento", () => {
  test("anon no accede al panel de testimonios", async ({ page }) => {
    await page.goto("/admin/testimonios");
    await page.waitForURL("**/admin/login**");
  });

  test("flujo completo: crear borrador, publicar con consentimiento y ver en home", async ({ page }) => {
    await login(page);
    await page.goto("/admin/testimonios");

    const nombre = `Paciente E2E ${Date.now()}`;
    await page.getByRole("link", { name: /Nuevo testimonio/ }).click();
    await page.fill("#patient_name", nombre);
    await page.fill("#quote", "Me atendieron muy bien, salí mejor en una sola sesión.");
    await page.locator("#rating").selectOption("5");
    await page.getByRole("button", { name: "Guardar testimonio" }).click();
    await expect(page.getByText("Testimonio guardado.")).toBeVisible();

    const tarjeta = page.locator("article", { has: page.getByRole("heading", { name: nombre }) });
    await expect(tarjeta.getByText("borrador")).toBeVisible();
    await expect(tarjeta.getByText("sin consentimiento")).toBeVisible();

    await tarjeta.getByRole("button", { name: "Publicar" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "consentimiento" }),
    ).toBeVisible();

    await tarjeta.getByRole("link", { name: "Editar" }).click();
    await page.locator('input[name="patient_consent"]').check();
    await page.locator('input[name="status"]').check();
    await page.getByRole("button", { name: "Guardar testimonio" }).click();
    await expect(page.getByText("Testimonio guardado.")).toBeVisible();

    await page.goto("/");
    await expect(page.getByText(nombre)).toBeVisible();
    await expect(page.getByText("Me atendieron muy bien")).toBeVisible();

    await page.goto("/admin/testimonios");
    const tarjeta2 = page.locator("article", { has: page.getByRole("heading", { name: nombre }) });
    page.on("dialog", (dialog) => dialog.accept());
    await tarjeta2.getByRole("button", { name: "Eliminar" }).click();
    await expect(page.getByText("Testimonio eliminado.")).toBeVisible();
    await page.goto("/");
    await expect(page.getByText(nombre)).toHaveCount(0);
  });
});
