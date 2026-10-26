import { expect, test } from "@playwright/test";
import { cargarEnvLocal, supabasePruebas } from "./utilidades";

const INICIO_PRUEBA = new Date().toISOString();

type AjustesPublicables = {
  id: string;
  phone: string;
  hours_note: string;
  address_street: string;
  maps_url: string;
  local_intro: string;
};

let ajustesOriginales: AjustesPublicables | null = null;

function asegurarBaseLocal(): void {
  cargarEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url)) {
    throw new Error("Pruebas config-b51 solo corren contra la base local de pruebas");
  }
}

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

test.beforeAll(async () => {
  asegurarBaseLocal();
  const { data, error } = await supabasePruebas()
    .from("business_settings")
    .select("id, phone, hours_note, address_street, maps_url, local_intro")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  ajustesOriginales = data as AjustesPublicables | null;
});

test.afterAll(async () => {
  asegurarBaseLocal();
  const supabase = supabasePruebas();

  await supabase
    .from("content_revisions")
    .delete()
    .gte("created_at", INICIO_PRUEBA);

  if (ajustesOriginales) {
    const { error } = await supabase
      .from("business_settings")
      .update({
        phone: ajustesOriginales.phone,
        hours_note: ajustesOriginales.hours_note,
        address_street: ajustesOriginales.address_street,
        maps_url: ajustesOriginales.maps_url,
        local_intro: ajustesOriginales.local_intro,
      })
      .eq("id", ajustesOriginales.id);
    if (error) throw new Error(error.message);
  }
});
