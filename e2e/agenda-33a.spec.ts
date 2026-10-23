import { expect, test } from "@playwright/test";
import { supabasePruebas } from "./utilidades";

function fechaLimaFutura(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
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

const idsBookings: string[] = [];
const idsBloqueos: string[] = [];

async function sembrarDatos(fecha: string): Promise<void> {
  const supabase = supabasePruebas();

  const { data: paciente } = await supabase
    .from("patients")
    .insert({ full_name: "Paciente Agenda 33A", phone: "911111111", contact_consent: true })
    .select("id")
    .single();

  const { data: variante } = await supabase
    .from("service_variants")
    .select("id, service_id, amount_cents")
    .limit(1)
    .single();

  if (!paciente || !variante) throw new Error("No se pudo sembrar datos de agenda");

  const crearBooking = async (
    status: "CONFIRMED" | "HELD",
    hora: string,
    holdExpiresAt: string | null,
  ): Promise<string> => {
    const starts = `${fecha}T${hora}:00-05:00`;
    const ends = new Date(new Date(starts).getTime() + 60 * 60_000).toISOString();
    const { data } = await supabase
      .from("bookings")
      .insert({
        service_id: variante.service_id,
        service_variant_id: variante.id,
        patient_id: paciente.id,
        starts_at: starts,
        ends_at: ends,
        status,
        token_expires_at: new Date(Date.now() + 3600_000).toISOString(),
        amount_cents: variante.amount_cents,
        deposit_required_cents: 0,
        public_code: `AG33A-${status}-${hora.replace(":", "")}-${Date.now()}`,
        hold_expires_at: holdExpiresAt,
        origin: status === "CONFIRMED" ? "IN_PERSON" : "WEB",
      })
      .select("id")
      .single();
    idsBookings.push(data!.id);
    return data!.id;
  };

  await crearBooking("CONFIRMED", "10:00", null);
  await crearBooking("HELD", "11:00", new Date(Date.now() + 10 * 60_000).toISOString());
  await crearBooking("HELD", "12:00", new Date(Date.now() - 10 * 60_000).toISOString());

  const { data: bloqueo } = await supabase
    .from("schedule_blocks")
    .insert({
      starts_at: `${fecha}T14:00:00-05:00`,
      ends_at: `${fecha}T15:00:00-05:00`,
      block_type: "BREAK",
      reason: "Bloqueo prueba 33A",
    })
    .select("id")
    .single();
  idsBloqueos.push(bloqueo!.id);
}

test.afterAll(async () => {
  const supabase = supabasePruebas();
  if (idsBookings.length > 0) await supabase.from("bookings").delete().in("id", idsBookings);
  if (idsBloqueos.length > 0) await supabase.from("schedule_blocks").delete().in("id", idsBloqueos);
  await supabase.from("patients").delete().eq("full_name", "Paciente Agenda 33A");
});

test.describe("HITO 3.3-A — calendario administrativo", () => {
  const fecha = fechaLimaFutura(3);

  test.beforeAll(async () => {
    await sembrarDatos(fecha);
  });

  test("anon no accede a la agenda", async ({ page }) => {
    await page.goto("/admin/agenda");
    await page.waitForURL("**/admin/login**");
  });

  test("vista diaria: confirmada, HELD vigente, retención vencida excluida y bloqueo", async ({ page }) => {
    await login(page);
    await page.goto(`/admin/agenda?vista=dia&fecha=${fecha}`);

    await expect(page.getByRole("heading", { name: "Agenda", level: 1 })).toBeVisible();
    await expect(page.getByText("America/Lima")).toBeVisible();
    await expect(page.getByText("Pendiente de confirmación").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Hoy/ })).toBeVisible();

    await expect(page.getByText("Código: AG33A-CONFIRMED-1000").first()).toBeVisible();
    await expect(page.getByText("Presencial").first()).toBeVisible();

    await expect(page.getByText("Código: AG33A-HELD-1100").first()).toBeVisible();

    await expect(page.getByText("Código: AG33A-HELD-1200")).toHaveCount(0);

    await expect(page.getByText("Bloqueada").first()).toBeVisible();
    await expect(page.getByText("Bloqueo prueba 33A")).toBeVisible();

    await expect(page.getByText(/Disponible:/)).toBeVisible();
  });

  test("vista semanal muestra los 7 días", async ({ page }) => {
    await login(page);
    await page.goto(`/admin/agenda?vista=semana&fecha=${fecha}`);
    await expect(page.getByText("Vista semanal")).toBeVisible();
    const encabezados = page.locator("section h2");
    expect(await encabezados.count()).toBe(7);
    await expect(page.getByText("Código: AG33A-CONFIRMED-1000").first()).toBeVisible();
  });
});
