import { expect, test } from "@playwright/test";

test.describe("FASE 2 — acceso administrativo", () => {
  test("el flujo completo de login y logout funciona", async ({ page }) => {
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
    await expect(page.getByRole("heading", { name: "Panel de control" })).toBeVisible();
    await expect(page.getByText("admin@almae.demo")).toBeVisible();

    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await page.waitForURL("**/admin/login");
  });

  test("credenciales incorrectas muestran error y no ingresan", async ({ page }) => {
    await page.goto("/admin/login");
    const intento = async (): Promise<void> => {
      await page.fill("#email", "admin@almae.demo");
      await page.fill("#password", "ContrasenaMala123");
      await page.getByRole("button", { name: "Iniciar sesión" }).click();
    };
    await intento();
    try {
      await expect(page.locator("p[role='alert']")).toContainText(
        "Correo o contraseña incorrectos",
        { timeout: 5000 },
      );
    } catch {
      await intento();
      await expect(page.locator("p[role='alert']")).toContainText(
        "Correo o contraseña incorrectos",
      );
    }
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
