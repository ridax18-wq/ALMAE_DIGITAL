import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { cargarEnvLocal, supabasePruebas } from "./utilidades";

const TELEFONOS = ["955557101", "955557102", "955557103"];
const MARCA = "Bloqueo prueba 33C";

function diasLaborables(desdeDia: number): [string, string, string] {
  const dias: string[] = [];
  for (let i = desdeDia; dias.length < 3 && i < desdeDia + 30; i += 1) {
    const iso = new Date(Date.now() + i * 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/Lima" });
    const dow = new Date(`${iso}T12:00:00Z`).getUTCDay();
    if (dow >= 1 && dow <= 5) dias.push(iso);
  }
  const [a, b, c] = dias;
  if (!a || !b || !c) throw new Error("No hay suficientes días laborables");
  return [a, b, c];
}

const [DIA_A, DIA_B, DIA_C] = diasLaborables(8);

function asegurarBaseLocal(): void {
  cargarEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url)) {
    throw new Error("Limpieza de pruebas 3.3-C bloqueada: la URL no es la base local de pruebas");
  }
}

async function limpiarDatosDePrueba(): Promise<void> {
  asegurarBaseLocal();
  const supabase = supabasePruebas();
  const desde = new Date(`${DIA_A}T00:00:00-05:00`).toISOString();
  const hasta = new Date(new Date(`${DIA_C}T00:00:00-05:00`).getTime() + 86_400_000).toISOString();

  const { data: pacientes, error: errP } = await supabase.from("patients").select("id").in("phone", TELEFONOS);
  if (errP) throw new Error(errP.message);
  const ids = (pacientes ?? []).map((p) => p.id);
  if (ids.length > 0) {
    const { error } = await supabase.from("bookings").delete().in("patient_id", ids);
    if (error) throw new Error(error.message);
    const { error: errPac } = await supabase.from("patients").delete().in("id", ids);
    if (errPac) throw new Error(errPac.message);
  }

  const { error: errB } = await supabase
    .from("schedule_blocks")
    .delete()
    .like("reason", `${MARCA}%`)
    .gte("starts_at", desde)
    .lt("starts_at", hasta);
  if (errB) throw new Error(errB.message);
}

async function varianteConsultorio(): Promise<{ id: string; slug: string; duracion: number; serviceId: string; monto: number; sena: number }> {
  const { data, error } = await supabasePruebas()
    .from("service_variants")
    .select("id, service_id, duration_minutes, amount_cents, deposit_cents, service:services!inner(slug, active, location)")
    .eq("services.active", true)
    .eq("services.location", "consultorio")
    .limit(1)
    .single();
  if (error || !data) throw new Error("No hay variante de consultorio activa");
  const servicio = data.service as unknown as { slug: string };
  return { id: data.id, slug: servicio.slug, duracion: data.duration_minutes, serviceId: data.service_id, monto: data.amount_cents, sena: data.deposit_cents };
}

async function login(page: Page): Promise<void> {
  await page.goto("/admin/login");
  await page.waitForLoadState("networkidle");
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

type Intervalo = { fecha: string; inicio: string; fechaFin?: string; fin: string; tipo?: string; motivo: string };

async function completarBloqueo(page: Page, datos: Intervalo): Promise<void> {
  await page.goto(`/admin/agenda?fecha=${datos.fecha}`);
  await page.getByLabel("Fecha del bloqueo", { exact: true }).fill(datos.fecha);
  await page.getByLabel("Inicio del bloqueo", { exact: true }).fill(datos.inicio);
  await page.getByLabel("Fecha de fin del bloqueo", { exact: true }).fill(datos.fechaFin ?? datos.fecha);
  await page.getByLabel("Fin del bloqueo", { exact: true }).fill(datos.fin);
  if (datos.tipo) await page.getByLabel("Tipo de bloqueo", { exact: true }).selectOption(datos.tipo);
  await page.getByPlaceholder("Motivo (opcional)").fill(datos.motivo);
}

function filaBloqueo(page: Page, motivo: string) {
  return page.locator("details").filter({ hasText: motivo });
}

test.describe("HITO 3.3-C — bloqueos administrativos de agenda", () => {
  test.beforeEach(async () => {
    await limpiarDatosDePrueba();
  });

  test("anon: sin sesión no ve la agenda y no puede llamar a la RPC de bloqueo", async ({ page }) => {
    await page.goto("/admin/agenda");
    await page.waitForURL("**/admin/login**");

    cargarEnvLocal();
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      { auth: { persistSession: false } },
    );
    const { data, error } = await anon.rpc("crear_bloqueo_agenda", {
      p_inicio: `${DIA_A}T15:00:00Z`,
      p_fin: `${DIA_A}T16:00:00Z`,
      p_tipo: "OTHER",
      p_reason: `${MARCA} anon`,
    });
    expect(error !== null || (data as { ok?: boolean } | null)?.ok === false).toBe(true);

    const { data: bloqueos } = await supabasePruebas()
      .from("schedule_blocks")
      .select("id")
      .like("reason", `${MARCA}%`);
    expect(bloqueos ?? []).toHaveLength(0);
  });

  test("crea un bloqueo válido, lo muestra con color y lo aplica a la disponibilidad web", async ({ page, request }) => {
    await login(page);
    await completarBloqueo(page, {
      fecha: DIA_A,
      inicio: "11:00",
      fin: "12:00",
      tipo: "LUNCH",
      motivo: `${MARCA} almuerzo`,
    });
    await expect(page.getByText(/Vista previa: Desde/)).toBeVisible();
    await page.getByRole("button", { name: "Bloquear horario", exact: true }).click();

    await expect(page.getByRole("status").filter({ hasText: "Bloqueo registrado" })).toBeVisible();
    const fila = filaBloqueo(page, `${MARCA} almuerzo`);
    await expect(fila).toContainText("Almuerzo");
    await expect(page.locator("li").filter({ hasText: `${MARCA} almuerzo` })).toHaveClass(/sand/);

    const variante = await varianteConsultorio();
    const respuesta = await request.get(`/api/disponibilidad?servicio=${variante.slug}&variante=${variante.id}&fecha=${DIA_A}`);
    expect(respuesta.ok()).toBe(true);
    const json = (await respuesta.json()) as { slots?: { inicioUtc: string }[] };
    expect((json.slots ?? []).length).toBeGreaterThan(0);
    const bloqueados = (json.slots ?? []).filter((s) => {
      const t = new Date(s.inicioUtc).getTime();
      return t >= new Date(`${DIA_A}T11:00:00-05:00`).getTime() && t < new Date(`${DIA_A}T12:00:00-05:00`).getTime();
    });
    expect(bloqueados).toHaveLength(0);
  });

  test("rechaza bloqueos superpuestos, citas confirmadas y retenciones HELD vigentes", async ({ page }) => {
    await login(page);

    await completarBloqueo(page, { fecha: DIA_A, inicio: "11:00", fin: "12:00", tipo: "LUNCH", motivo: `${MARCA} base` });
    await page.getByRole("button", { name: "Bloquear horario", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Bloqueo registrado" })).toBeVisible();

    await completarBloqueo(page, { fecha: DIA_A, inicio: "11:30", fin: "12:30", tipo: "ABSENCE", motivo: `${MARCA} solape` });
    await page.getByRole("button", { name: "Bloquear horario", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Ya existe un bloqueo en ese horario." })).toBeVisible();

    await page.goto(`/admin/agenda?fecha=${DIA_B}`);
    await page.getByLabel("Hora", { exact: true }).fill("16:00");
    await page.getByLabel("Fecha", { exact: true }).first().fill(DIA_B);
    await page.getByLabel("Origen de la reserva").selectOption("IN_PERSON");
    await page.getByPlaceholder("Nombre completo").fill("Paciente Confirmada 33C");
    await page.getByPlaceholder(/Celular 9XXXXXXXX/).fill(TELEFONOS[0] ?? "");
    await page.getByRole("button", { name: "Registrar presencial (CONFIRMED)" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Reserva presencial registrada" })).toBeVisible();

    await completarBloqueo(page, { fecha: DIA_B, inicio: "15:30", fin: "17:00", tipo: "BREAK", motivo: `${MARCA} confirmada` });
    await page.getByRole("button", { name: "Bloquear horario", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Hay citas confirmadas en ese horario" })).toBeVisible();

    const variante = await varianteConsultorio();
    const { data: paciente, error: errPac } = await supabasePruebas()
      .from("patients")
      .insert({ full_name: "Retencion Prueba 33C", phone: TELEFONOS[1] ?? "", contact_consent: false })
      .select("id")
      .single();
    if (errPac || !paciente) throw new Error(errPac?.message ?? "paciente no creado");
    const inicio = new Date(`${DIA_C}T10:00:00-05:00`);
    const fin = new Date(inicio.getTime() + variante.duracion * 60_000);
    const { data: hold, error: errHold } = await supabasePruebas()
      .from("bookings")
      .insert({
        service_id: variante.serviceId,
        service_variant_id: variante.id,
        patient_id: paciente.id,
        starts_at: inicio.toISOString(),
        ends_at: fin.toISOString(),
        status: "HELD",
        origin: "WEB",
        public_code: `ALM-T33C${Date.now().toString(36).toUpperCase()}`,
        token_expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        hold_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
        amount_cents: variante.monto,
        deposit_required_cents: variante.sena,
        deposit_verified_cents: 0,
        currency: "PEN",
        notes: "",
      })
      .select("id")
      .single();
    if (errHold || !hold) throw new Error(errHold?.message ?? "retención no creada");

    await completarBloqueo(page, { fecha: DIA_C, inicio: "09:30", fin: "10:30", tipo: "OTHER", motivo: `${MARCA} held` });
    await page.getByRole("button", { name: "Bloquear horario", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "retención vigente" })).toBeVisible();
  });

  test("libera un bloqueo tras confirmar y vuelve a evaluar disponibilidad", async ({ page, request }) => {
    await login(page);
    await completarBloqueo(page, { fecha: DIA_A, inicio: "17:00", fin: "18:00", tipo: "MAINTENANCE", motivo: `${MARCA} liberar` });
    await page.getByRole("button", { name: "Bloquear horario", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Bloqueo registrado" })).toBeVisible();

    const fila = filaBloqueo(page, `${MARCA} liberar`);
    await fila.locator("summary").click();
    page.once("dialog", (d) => d.dismiss());
    await fila.getByRole("button", { name: "Liberar horario" }).click();
    await expect(fila).toBeVisible();

    page.once("dialog", (d) => d.accept());
    await fila.getByRole("button", { name: "Liberar horario" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Horario liberado" })).toBeVisible();
    await expect(filaBloqueo(page, `${MARCA} liberar`)).toHaveCount(0);

    const variante = await varianteConsultorio();
    const respuesta = await request.get(`/api/disponibilidad?servicio=${variante.slug}&variante=${variante.id}&fecha=${DIA_A}`);
    expect(respuesta.ok()).toBe(true);
    const json = (await respuesta.json()) as { slots?: { inicioUtc: string }[] };
    const aperturaTarde = new Date(`${DIA_A}T17:00:00-05:00`).getTime();
    const enHorario = (json.slots ?? []).some((s) => new Date(s.inicioUtc).getTime() === aperturaTarde);
    expect(enHorario).toBe(true);
  });

  test("valida que la hora final no sea anterior al inicio y bloquea el envío", async ({ page }) => {
    await login(page);
    await completarBloqueo(page, { fecha: DIA_A, inicio: "12:00", fin: "11:00", motivo: `${MARCA} invalido` });
    await expect(page.getByText("La hora final debe ser posterior al inicio del bloqueo")).toBeVisible();
    await expect(page.getByRole("button", { name: "Bloquear horario", exact: true })).toBeDisabled();
  });
});
