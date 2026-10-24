import { expect, test, type Page } from "@playwright/test";
import { cargarEnvLocal, supabasePruebas } from "./utilidades";

const TELEFONOS_PRUEBA = ["955555551", "955555552", "955555553", "955555554", "955555555", "955555556"];
const MOTIVO_BLOQUEO = "Bloqueo prueba 33B";

function diasLaborables(): [string, string, string] {
  const dias: string[] = [];
  for (let i = 1; dias.length < 3 && i < 30; i += 1) {
    const d = new Date(Date.now() + i * 86_400_000);
    const iso = d.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
    const dow = new Date(`${iso}T12:00:00Z`).getUTCDay();
    if (dow >= 1 && dow <= 5) dias.push(iso);
  }
  const [a, b, c] = dias;
  if (!a || !b || !c) throw new Error("No hay suficientes días laborables");
  return [a, b, c];
}

const [DIA_A, DIA_B, DIA_C] = diasLaborables();

function asegurarBaseLocal(): void {
  cargarEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url)) {
    throw new Error("Limpieza de pruebas 3.3-B bloqueada: la URL no es la base local de pruebas");
  }
}

async function limpiarDatosDePrueba(): Promise<void> {
  asegurarBaseLocal();
  const supabase = supabasePruebas();
  const desde = new Date(`${DIA_A}T00:00:00-05:00`).toISOString();
  const hasta = new Date(new Date(`${DIA_C}T00:00:00-05:00`).getTime() + 86_400_000).toISOString();

  const { data: pacientes, error: errPacientes } = await supabase
    .from("patients")
    .select("id")
    .in("phone", TELEFONOS_PRUEBA);
  if (errPacientes) throw new Error(errPacientes.message);
  const ids = (pacientes ?? []).map((p) => p.id);
  if (ids.length > 0) {
    const { error } = await supabase.from("bookings").delete().in("patient_id", ids);
    if (error) throw new Error(error.message);
    const { error: errPac } = await supabase.from("patients").delete().in("id", ids);
    if (errPac) throw new Error(errPac.message);
  }

  const { error: errBloq } = await supabase
    .from("schedule_blocks")
    .delete()
    .eq("reason", MOTIVO_BLOQUEO)
    .gte("starts_at", desde)
    .lt("starts_at", hasta);
  if (errBloq) throw new Error(errBloq.message);
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

async function crearCita(
  page: Page,
  fecha: string,
  hora: string,
  origen: string,
  nombre: string,
  telefono: string,
): Promise<void> {
  await page.goto(`/admin/agenda?fecha=${fecha}`);
  const inputFecha = page.getByLabel("Fecha", { exact: true }).first();
  const inputHora = page.getByLabel("Hora", { exact: true });
  await inputFecha.fill(fecha);
  await inputHora.fill(hora);
  await expect(inputFecha).toHaveValue(fecha);
  await expect(inputHora).toHaveValue(hora);
  await page.getByLabel("Origen de la reserva").selectOption(origen);
  await page.getByPlaceholder("Nombre completo").fill(nombre);
  await page.getByPlaceholder(/Celular 9XXXXXXXX/).fill(telefono);
  await page.getByRole("button", { name: "Registrar presencial (CONFIRMED)" }).click();
}

test.describe("HITO 3.3-B â€” reservas presenciales y WhatsApp", () => {
  test.beforeEach(async () => {
    await limpiarDatosDePrueba();
  });

  test("anon no accede al formulario de nuevas citas", async ({ page }) => {
    await page.goto("/admin/agenda");
    await page.waitForURL("**/admin/login**");
  });

  test("crea cita presencial, WhatsApp y teléfono con origen correcto", async ({ page }) => {
    await login(page);

    await crearCita(page, DIA_A, "10:00", "IN_PERSON", "Paciente Presencial 33B", "955555551");
    await expect(page.getByRole("status").filter({ hasText: "Reserva presencial registrada" })).toBeVisible();
    const filaPresencial = page.locator("li").filter({ hasText: "Paciente Presencial 33B" });
    await expect(filaPresencial.getByText("Presencial", { exact: true })).toBeVisible();
    await expect(filaPresencial).toContainText("Código: ALM-");

    await crearCita(page, DIA_A, "16:00", "WHATSAPP", "Paciente WhatsApp 33B", "955555552");
    await expect(page.getByRole("status").filter({ hasText: "Reserva presencial registrada" })).toBeVisible();
    const filaWa = page.locator("li").filter({ hasText: "Paciente WhatsApp 33B" });
    await expect(filaWa.getByText("WhatsApp", { exact: true })).toBeVisible();
    const enlaceWa = filaWa.getByRole("link", { name: "Confirmar por WhatsApp", exact: true });
    await expect(enlaceWa).toHaveAttribute("href", /wa\.me/);

    await crearCita(page, DIA_A, "18:00", "PHONE", "Paciente Telefono 33B", "955555553");
    await expect(page.getByRole("status").filter({ hasText: "Reserva presencial registrada" })).toBeVisible();
    const filaTel = page.locator("li").filter({ hasText: "Paciente Telefono 33B" });
    await expect(filaTel.getByText("Teléfono", { exact: true })).toBeVisible();
  });

  test("rechaza horario ocupado y horario bloqueado", async ({ page }) => {
    await login(page);

    await crearCita(page, DIA_B, "10:00", "IN_PERSON", "Base Ocupada 33B", "955555554");
    await expect(page.getByRole("status").filter({ hasText: "Reserva presencial registrada" })).toBeVisible();

    await crearCita(page, DIA_B, "10:00", "IN_PERSON", "Choque Ocupado 33B", "955555555");
    await expect(page.getByRole("alert").filter({ hasText: /ocupado\. Elige/ })).toBeVisible();

    await page.goto(`/admin/agenda?fecha=${DIA_B}`);
    await page.getByLabel("Fecha del bloqueo", { exact: true }).fill(DIA_B);
    await page.getByLabel("Inicio del bloqueo", { exact: true }).fill("15:00");
    await page.getByLabel("Fecha de fin del bloqueo", { exact: true }).fill(DIA_B);
    await page.getByLabel("Fin del bloqueo", { exact: true }).fill("16:00");
    await page.getByLabel("Tipo de bloqueo").selectOption("BREAK");
    await page.getByPlaceholder("Motivo (opcional)").fill(MOTIVO_BLOQUEO);
    await page.getByRole("button", { name: "Bloquear horario", exact: true }).click();
    await expect(page.getByText(MOTIVO_BLOQUEO).first()).toBeVisible();

    await crearCita(page, DIA_B, "15:30", "IN_PERSON", "Choque Bloqueo 33B", "955555556");
    await expect(page.getByRole("alert").filter({ hasText: /ocupado\. Elige/ })).toBeVisible();
  });

  test("las citas administrativas ocupan agenda_occupancy", async ({ page }) => {
    await login(page);
    await crearCita(page, DIA_C, "10:00", "WHATSAPP", "Ocupacion Prueba 33B", "955555551");
    await expect(page.getByRole("status").filter({ hasText: "Reserva presencial registrada" })).toBeVisible();

    const supabase = supabasePruebas();
    const { data: paciente } = await supabase
      .from("patients")
      .select("id")
      .eq("phone", "955555551")
      .single();
    const { data: citas, error } = await supabase
      .from("bookings")
      .select("id, origin, status")
      .eq("patient_id", paciente?.id ?? "");
    expect(error).toBeNull();
    expect(citas).toHaveLength(1);
    expect(citas?.[0]?.origin).toBe("WHATSAPP");
    expect(citas?.[0]?.status).toBe("CONFIRMED");

    const { data: ocupacion } = await supabase
      .from("agenda_occupancy")
      .select("source")
      .eq("booking_id", citas?.[0]?.id ?? "");
    expect(ocupacion).toHaveLength(1);
    expect(ocupacion?.[0]?.source).toBe("BOOKING");
  });
});
