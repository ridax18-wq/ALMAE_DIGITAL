import { expect, test } from "@playwright/test";

test.describe("FASE 2 — acceso administrativo", () => {
  test("el flujo completo de login y logout funciona", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("#email", "admin@almae.demo");
    await page.fill("#password", "DemoAlmae2026");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await page.waitForURL("**/admin");
    await expect(page.getByRole("heading", { name: "Panel de control" })).toBeVisible();
    await expect(page.getByText("admin@almae.demo")).toBeVisible();

    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await page.waitForURL("**/admin/login");
  });

  test("credenciales incorrectas muestran error y no ingresan", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("#email", "admin@almae.demo");
    await page.fill("#password", "ContrasenaMala123");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page.locator("p[role='alert']")).toContainText(
      "Correo o contraseña incorrectos",
    );
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
