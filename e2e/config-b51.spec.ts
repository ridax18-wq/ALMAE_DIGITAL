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

test.describe("HITO 3.2-B5.1 — ubicación, contacto y horarios", () => {
  test("anon no accede a las páginas de configuración pública", async ({ page }) => {
    for (const ruta of ["/admin/ubicacion", "/admin/contacto", "/admin/horarios"]) {
      await page.goto(ruta);
      await page.waitForURL("**/admin/login**");
    }
  });

  test("contacto: guardar borrador no publica y al publicar se ve en el sitio", async ({ page }) => {
    await login(page);
    await page.goto("/admin/contacto");

    const telefono = `01 ${Date.now().toString().slice(-7)}`;
    await page.fill("#phone", telefono);
    await page.getByRole("button", { name: "Guardar borrador" }).click();
    await expect(page.getByText("Borrador guardado.")).toBeVisible();
    await expect(page.getByText("Hay un borrador sin publicar")).toBeVisible();

    await page.goto("/contacto");
    await expect(page.getByText(telefono)).toHaveCount(0);

    await page.goto("/admin/contacto");
    await page.getByRole("button", { name: "Publicar borrador" }).click();
    await expect(page.getByText("Contacto publicado.")).toBeVisible();

    await page.goto("/contacto");
    await expect(page.getByRole("contentinfo").getByText(telefono)).toBeVisible();
  });

  test("ubicación: borrador con dirección y enlace de Maps inválido es rechazado", async ({ page }) => {
    await login(page);
    await page.goto("/admin/ubicacion");

    await page.fill("#address_street", `Altos del Rímac 250 piso ${Date.now()}`);
    await page.fill("#maps_url", "https://ejemplo-no-google.com/maps");
    await page.getByRole("button", { name: "Guardar borrador" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Google Maps" }),
    ).toBeVisible();

    await page.fill("#maps_url", "");
    await page.getByRole("button", { name: "Guardar borrador" }).click();
    await expect(page.getByText("Borrador guardado.")).toBeVisible();

    await page.getByRole("button", { name: "Publicar borrador" }).click();
    await expect(page.getByText("Ubicación publicada.")).toBeVisible();

    await page.goto("/");
    await expect(page.getByText("Información de visita")).toBeVisible();
  });

  test("horarios: el texto visible se guarda como borrador y se publica", async ({ page }) => {
    await login(page);
    await page.goto("/admin/horarios");

    const nota = `Horario de prueba B51 ${Date.now()}`;
    await page.fill("#hours_note", nota);
    await page
      .locator("form")
      .filter({ hasText: "Horario comercial visible" })
      .getByRole("button", { name: "Guardar borrador" })
      .click();
    await expect(page.getByText("Borrador guardado.")).toBeVisible();

    await page.getByRole("button", { name: "Publicar borrador" }).click();
    await expect(page.getByText("Texto publicado.")).toBeVisible();

    await page.goto("/contacto");
    await expect(page.locator("#contenido").getByText(nota)).toBeVisible();
  });
});

test.afterAll(async () => {
  const supabase = supabasePruebas();
  await supabase.from("content_revisions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase
    .from("business_settings")
    .update({
      phone: "",
      hours_note: "",
      address_street: "Altos del Rímac 250",
      maps_url: "",
      local_intro: "",
    })
    .neq("id", "00000000-0000-0000-0000-000000000000");
});
