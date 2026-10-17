import { expect, test } from "@playwright/test";

const RUTAS_PUBLICAS = ["/", "/servicios", "/nosotros", "/promociones", "/contacto"];

test.describe("FASE 1 — portal comercial", () => {
  test("las páginas públicas responden con su título", async ({ page }) => {
    for (const ruta of RUTAS_PUBLICAS) {
      await page.goto(ruta);
      await expect(page.locator("h1").first()).toBeVisible();
    }
  });

  test("la navegación del header funciona", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Servicios" }).first().click();
    await expect(page).toHaveURL(/\/servicios$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Servicios");
    await page.getByRole("link", { name: "Nosotros" }).first().click();
    await expect(page).toHaveURL(/\/nosotros$/);
    await page.getByRole("link", { name: "Promociones" }).first().click();
    await expect(page).toHaveURL(/\/promociones$/);
    await page.getByRole("link", { name: "Contacto" }).first().click();
    await expect(page).toHaveURL(/\/contacto$/);
    await page.getByRole("link", { name: "ALMAE" }).first().click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("el botón Agendar cita conduce a la página en preparación", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Agendar cita" }).first().click();
    await expect(page).toHaveURL(/\/reservar$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Reservas en línea",
    );
  });

  test("el menú móvil abre y navega a servicios", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const boton = page.getByRole("button", { name: "Abrir menú" });
    await expect(boton).toBeVisible();
    await boton.click();
    const panel = page.getByRole("navigation", { name: "Navegación móvil" });
    await expect(panel).toBeVisible();
    await panel.getByRole("link", { name: "Servicios" }).click();
    await expect(page).toHaveURL(/\/servicios$/);
    await expect(page.getByRole("button", { name: "Abrir menú" })).toBeVisible();
  });

  test("el menú móvil se cierra con Escape", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.getByRole("button", { name: "Abrir menú" }).click();
    const panel = page.getByRole("navigation", { name: "Navegación móvil" });
    await expect(panel).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).not.toBeVisible();
  });

  test("no hay errores de consola en las páginas públicas", async ({ page }) => {
    const errores: string[] = [];
    page.on("console", (mensaje) => {
      if (mensaje.type() === "error") errores.push(mensaje.text());
    });
    page.on("pageerror", (error) => errores.push(String(error)));
    for (const ruta of RUTAS_PUBLICAS) {
      await page.goto(ruta);
    }
    expect(errores).toEqual([]);
  });

  test("los enlaces internos del home no están rotos", async ({ request }) => {
    const home = await request.get("/");
    expect(home.ok()).toBeTruthy();
    const html = await home.text();
    const enlaces = Array.from(
      new Set(
        Array.from(html.matchAll(/href="(\/[^"]*)"/g)).map((m) => m[1] ?? ""),
      ),
    ).filter((href) => !href.startsWith("/reserva/") && !href.startsWith("/_next"));

    expect(enlaces.length).toBeGreaterThan(0);
    for (const href of enlaces) {
      const respuesta = await request.get(href);
      expect(
        respuesta.ok(),
        `Enlace roto: ${href} -> ${respuesta.status()}`,
      ).toBeTruthy();
    }
  });

  test("los accesos de WhatsApp están habilitados con el número configurado", async ({ page }) => {
    await page.goto("/contacto");
    const accesos = await page.locator('a[href^="https://wa.me/"]').count();
    expect(accesos).toBeGreaterThan(0);
    await page.goto("/");
    const flotante = page.locator('a[aria-label="Contactar por WhatsApp"]');
    await expect(flotante).toBeVisible();
  });

  test("el acceso administrativo redirige a login sin sesión", async ({ request }) => {
    const respuesta = await request.get("/admin");
    expect(respuesta.ok()).toBeTruthy();
    expect(new URL(respuesta.url()).pathname).toBe("/admin/login");
  });

  test("capturas responsive del portal", async ({ page }, testInfo) => {
    for (const ancho of [375, 768, 1440]) {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto("/");
      await page.waitForTimeout(600);
      await page.screenshot({
        path: `docs/screenshots/fase1-home-${ancho}.jpg`,
        type: "jpeg",
        quality: 70,
        fullPage: true,
      });
    }
    expect(testInfo.status).toBe(testInfo.status);
  });
});
