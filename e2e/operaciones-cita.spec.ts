import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cargarEnvLocal, supabasePruebas } from "./utilidades";

const TELEFONOS = ["955557201", "955557202", "955557203", "955557204", "955557205"];
const MARCA = "Operacion prueba 33D";
const DOMINIO_PRUEBA = "@prueba-33d.local";

function diasLaborables(desdeDia: number, cantidad: 3): [string, string, string] {
  const dias: string[] = [];
  for (let i = desdeDia; dias.length < cantidad && i < desdeDia + 30; i += 1) {
    const iso = new Date(Date.now() + i * 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/Lima" });
    const dow = new Date(`${iso}T12:00:00Z`).getUTCDay();
    if (dow >= 1 && dow <= 5) dias.push(iso);
  }
  const [a, b, c] = dias;
  if (!a || !b || !c) throw new Error("No hay suficientes dias laborables");
  return [a, b, c];
}

const [DIA_A, DIA_B, DIA_C] = diasLaborables(14, 3);

function asegurarBaseLocal(): void {
  cargarEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url)) {
    throw new Error("Limpieza de pruebas 3.3-D bloqueada: la URL no es la base local de pruebas");
  }
}

function nuevoClienteAnon(): SupabaseClient {
  cargarEnvLocal();
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function clienteOwner(): Promise<SupabaseClient> {
  const cliente = nuevoClienteAnon();
  const { error } = await cliente.auth.signInWithPassword({
    email: "admin@almae.demo",
    password: "DemoAlmae2026",
  });
  if (error) throw new Error(`No se pudo iniciar sesion de owner: ${error.message}`);
  return cliente;
}

async function limpiarUsuariosPrueba(supabase: SupabaseClient): Promise<void> {
  const { data } = await supabase.auth.admin.listUsers({ perPage: 200 });
  for (const usuario of data?.users ?? []) {
    if (usuario.email?.endsWith(DOMINIO_PRUEBA)) {
      await supabase.auth.admin.deleteUser(usuario.id);
    }
  }
}

async function limpiarDatosDePrueba(): Promise<void> {
  asegurarBaseLocal();
  const supabase = supabasePruebas();

  await limpiarUsuariosPrueba(supabase);

  const { data: pacientes } = await supabase.from("patients").select("id").in("phone", TELEFONOS);
  const ids = (pacientes ?? []).map((p) => p.id);
  if (ids.length > 0) {
    const { error } = await supabase.from("bookings").delete().in("patient_id", ids);
    if (error) throw new Error(error.message);
    const { error: errPac } = await supabase.from("patients").delete().in("id", ids);
    if (errPac) throw new Error(errPac.message);
  }

  const desde = new Date(`${DIA_A}T00:00:00-05:00`).toISOString();
  const hasta = new Date(new Date(`${DIA_C}T00:00:00-05:00`).getTime() + 86_400_000).toISOString();
  const { error: errB } = await supabase
    .from("schedule_blocks")
    .delete()
    .like("reason", `${MARCA}%`)
    .gte("starts_at", desde)
    .lt("starts_at", hasta);
  if (errB) throw new Error(errB.message);
}

async function varianteConsultorio(): Promise<{
  id: string;
  slug: string;
  duracion: number;
  serviceId: string;
  monto: number;
  sena: number;
}> {
  const { data, error } = await supabasePruebas()
    .from("service_variants")
    .select("id, service_id, duration_minutes, amount_cents, deposit_cents, service:services!inner(slug, active, location)")
    .eq("services.active", true)
    .eq("services.location", "consultorio")
    .limit(1)
    .single();
  if (error || !data) throw new Error("No hay variante de consultorio activa");
  const servicio = data.service as unknown as { slug: string };
  return {
    id: data.id,
    slug: servicio.slug,
    duracion: data.duration_minutes,
    serviceId: data.service_id,
    monto: data.amount_cents,
    sena: data.deposit_cents,
  };
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

async function crearReserva(entrada: {
  dia: string;
  hora: string;
  telefono: string;
  nombre: string;
  status?: "HELD" | "CONFIRMED";
  depositoVerificado?: boolean;
}): Promise<{ id: string; publicCode: string }> {
  const variante = await varianteConsultorio();
  const inicio = new Date(`${entrada.dia}T${entrada.hora}:00-05:00`);
  const fin = new Date(inicio.getTime() + variante.duracion * 60_000);
  const supabase = supabasePruebas();

  const { data: paciente, error: errPac } = await supabase
    .from("patients")
    .insert({ full_name: entrada.nombre, phone: entrada.telefono, contact_consent: false })
    .select("id")
    .single();
  if (errPac || !paciente) throw new Error(errPac?.message ?? "paciente no creado");

  const codigo = `ALM-T33D${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000)}`;
  const { data: reserva, error: errRes } = await supabase
    .from("bookings")
    .insert({
      service_id: variante.serviceId,
      service_variant_id: variante.id,
      patient_id: paciente.id,
      starts_at: inicio.toISOString(),
      ends_at: fin.toISOString(),
      status: entrada.status ?? "CONFIRMED",
      origin: "WEB",
      public_code: codigo,
      token_expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      hold_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      amount_cents: Math.max(variante.monto, 1000),
      deposit_required_cents: variante.sena,
      deposit_verified_cents: entrada.depositoVerificado ? Math.max(variante.sena, 100) : 0,
      currency: "PEN",
      notes: "",
    })
    .select("id, public_code")
    .single();
  if (errRes || !reserva) throw new Error(errRes?.message ?? "reserva no creada");

  if (entrada.depositoVerificado) {
    const { error: errPago } = await supabase.from("manual_payments").insert({
      booking_id: reserva.id,
      method: "YAPE",
      amount_cents: Math.max(variante.sena, 100),
      verification_status: "VERIFIED",
      transaction_reference: `T33D-${codigo}`,
      paid_at: new Date().toISOString(),
      verified_at: new Date().toISOString(),
    });
    if (errPago) throw new Error(errPago.message);
  }

  return { id: reserva.id, publicCode: codigo };
}

async function leerReserva(id: string) {
  const { data, error } = await supabasePruebas()
    .from("bookings")
    .select("status, starts_at, ends_at, amount_cents, deposit_required_cents, deposit_verified_cents")
    .eq("id", id)
    .single();
  if (error || !data) throw new Error(error?.message ?? "reserva no encontrada");
  return data;
}

function tieneHora(slots: string[], dia: string, hora: string): boolean {
  const objetivo = new Date(`${dia}T${hora}:00-05:00`).getTime();
  return slots.some((s) => new Date(s).getTime() === objetivo);
}

async function slotsDeDia(request: import("@playwright/test").APIRequestContext, dia: string): Promise<string[]> {
  const variante = await varianteConsultorio();
  const respuesta = await request.get(
    `/api/disponibilidad?servicio=${variante.slug}&variante=${variante.id}&fecha=${dia}`,
  );
  expect(respuesta.ok()).toBe(true);
  const json = (await respuesta.json()) as { slots?: { inicioUtc: string }[] };
  return (json.slots ?? []).map((s) => s.inicioUtc);
}

async function prepararReprogramacion(
  page: Page,
  fecha: string,
  horaObjetivo: string,
  motivo: string,
): Promise<string> {
  const form = page.locator("form").filter({ hasText: "Motivo del cambio" }).first();
  await form.getByLabel("Nueva fecha").fill(fecha);
  await form.getByRole("button", { name: /Ver horas disponibles/ }).click();
  const chip = form.locator("button").filter({ hasText: /^\d{2}:\d{2}$/ });
  await expect(chip.first()).toBeVisible();
  const preferido = chip.filter({ hasText: horaObjetivo });
  if ((await preferido.count()) > 0) {
    await preferido.first().click();
  } else {
    await chip.first().click();
  }
  const horaElegida =
    (await form.locator('input[name="hora_nueva"]').inputValue()) ||
    (await chip.first().textContent())?.trim() ||
    "";
  await form.getByLabel("Motivo del cambio").fill(motivo);
  return horaElegida;
}

async function confirmarReprogramacion(page: Page): Promise<void> {
  const form = page.locator("form").filter({ hasText: "Motivo del cambio" }).first();
  page.once("dialog", (d) => d.accept());
  await form.getByRole("button", { name: "Reprogramar", exact: true }).click();
}

async function reprogramarDesdeDetalle(page: Page, fecha: string, horaObjetivo: string, motivo: string): Promise<string> {
  const hora = await prepararReprogramacion(page, fecha, horaObjetivo, motivo);
  await confirmarReprogramacion(page);
  return hora;
}

test.describe("HITO 3.3-D — reprogramacion, cancelacion y asistencia", () => {
  test.beforeEach(async () => {
    await limpiarDatosDePrueba();
  });

  test("anon y usuario autenticado no owner son rechazados", async ({ page }) => {
    await page.goto("/admin/reservas");
    await page.waitForURL("**/admin/login**");

    const anon = nuevoClienteAnon();
    const { data: dataAnon, error: errAnon } = await anon.rpc("cancelar_reserva_admin", {
      p_booking_id: "00000000-0000-0000-0000-000000000000",
      p_motivo: `${MARCA} anon`,
    });
    expect(errAnon !== null || (dataAnon as { ok?: boolean } | null)?.ok === false).toBe(true);

    const supabase = supabasePruebas();
    const email = `no-owner-${Date.now().toString(36)}${DOMINIO_PRUEBA}`;
    const { data: creado, error: errCrea } = await supabase.auth.admin.createUser({
      email,
      password: "Prueba33D!",
      email_confirm: true,
    });
    if (errCrea || !creado.user) throw new Error(errCrea?.message ?? "usuario de prueba no creado");

    const cliente = nuevoClienteAnon();
    const { error: errLogin } = await cliente.auth.signInWithPassword({ email, password: "Prueba33D!" });
    expect(errLogin).toBeNull();

    const { data, error } = await cliente.rpc("cancelar_reserva_admin", {
      p_booking_id: "00000000-0000-0000-0000-000000000000",
      p_motivo: `${MARCA} no owner`,
    });
    expect(error).toBeNull();
    expect(data).toMatchObject({ ok: false, error: "no_autorizado" });

    const { data: dataReprog, error: errReprog } = await cliente.rpc("reprogramar_reserva_admin", {
      p_booking_id: "00000000-0000-0000-0000-000000000000",
      p_inicio: `${DIA_A}T10:00:00-05:00`,
      p_motivo: `${MARCA} no owner`,
    });
    expect(errReprog).toBeNull();
    expect(dataReprog).toMatchObject({ ok: false, error: "no_autorizado" });

    await supabase.auth.admin.deleteUser(creado.user.id);
  });

  test("reprograma con motivo, conserva adelantos y libera el horario anterior", async ({ page, request }) => {
    const reserva = await crearReserva({
      dia: DIA_A,
      hora: "10:00",
      telefono: TELEFONOS[0] ?? "",
      nombre: "Paciente Reprogramada 33D",
      depositoVerificado: true,
    });

    const antes = await slotsDeDia(request, DIA_A);
    expect(tieneHora(antes, DIA_A, "10:00")).toBe(false);

    await login(page);
    await page.goto(`/admin/reservas/${reserva.id}`);

    await expect(
      page.locator("form").filter({ hasText: "Motivo del cambio" }).first(),
    ).toBeVisible();
    const horaNueva = await reprogramarDesdeDetalle(page, DIA_B, "17:00", `${MARCA} cambio de horario`);

    await expect(page.getByRole("status").filter({ hasText: "Cita reprogramada" })).toBeVisible();

    const despues = await leerReserva(reserva.id);
    expect(new Date(despues.starts_at).toISOString().slice(0, 10)).toBe(DIA_B);
    expect(despues.amount_cents).toBeGreaterThan(0);
    expect(despues.deposit_verified_cents).toBeGreaterThan(0);

    const { data: pagos } = await supabasePruebas()
      .from("manual_payments")
      .select("id, verification_status")
      .eq("booking_id", reserva.id);
    expect(pagos ?? []).toHaveLength(1);
    expect(pagos?.[0]?.verification_status).toBe("VERIFIED");

    const { data: eventos } = await supabasePruebas()
      .from("booking_events")
      .select("reason, actor")
      .eq("booking_id", reserva.id)
      .order("created_at");
    const eventoReprog = (eventos ?? []).find((e) => e.reason.includes("reprogramada"));
    expect(eventoReprog?.reason).toContain(`${MARCA} cambio de horario`);
    expect(eventoReprog?.actor).toBe("admin");

    const { data: auditoria } = await supabasePruebas()
      .from("audit_logs")
      .select("action, after")
      .eq("entity_id", reserva.id)
      .eq("action", "reserva.reprogramada");
    expect((auditoria ?? []).length).toBeGreaterThan(0);
    expect(JSON.stringify(auditoria?.[0]?.after)).toContain(`${MARCA} cambio de horario`);

    const despuesB = await slotsDeDia(request, DIA_B);
    expect(tieneHora(despuesB, DIA_B, horaNueva)).toBe(false);

    const despuesA = await slotsDeDia(request, DIA_A);
    expect(tieneHora(despuesA, DIA_A, "10:00")).toBe(true);
  });

  test("reprogramar hacia un horario ocupado falla y no modifica la reserva", async ({ page }) => {
    const origen = await crearReserva({
      dia: DIA_A,
      hora: "10:00",
      telefono: TELEFONOS[1] ?? "",
      nombre: "Paciente Origen 33D",
    });

    await login(page);
    await page.goto(`/admin/reservas/${origen.id}`);

    const hora = await prepararReprogramacion(page, DIA_B, "17:00", `${MARCA} hacia ocupado`);
    await crearReserva({
      dia: DIA_B,
      hora,
      telefono: TELEFONOS[2] ?? "",
      nombre: "Paciente Ocupa 33D",
    });
    await confirmarReprogramacion(page);
    await expect(page.getByRole("alert").filter({ hasText: "El nuevo horario est\u00e1 ocupado" })).toBeVisible();

    const despues = await leerReserva(origen.id);
    expect(new Date(despues.starts_at).toISOString().slice(0, 10)).toBe(DIA_A);
  });

  test("reprogramar hacia un bloqueo falla y no modifica la reserva", async ({ page }) => {
    const origen = await crearReserva({
      dia: DIA_A,
      hora: "11:00",
      telefono: TELEFONOS[3] ?? "",
      nombre: "Paciente Bloqueado 33D",
    });

    await login(page);
    await page.goto(`/admin/reservas/${origen.id}`);

    const hora = await prepararReprogramacion(page, DIA_B, "17:00", `${MARCA} hacia bloqueo`);
    const inicioBloqueo = new Date(new Date(`${DIA_B}T${hora}:00-05:00`).getTime() - 30 * 60_000);
    const finBloqueo = new Date(inicioBloqueo.getTime() + 3 * 3_600_000);
    await supabasePruebas().from("schedule_blocks").insert({
      starts_at: inicioBloqueo.toISOString(),
      ends_at: finBloqueo.toISOString(),
      block_type: "OTHER",
      reason: `${MARCA} bloqueo manual`,
    });
    await confirmarReprogramacion(page);
    await expect(page.getByRole("alert").filter({ hasText: "El nuevo horario est\u00e1 ocupado" })).toBeVisible();

    const despues = await leerReserva(origen.id);
    expect(new Date(despues.starts_at).toISOString().slice(0, 10)).toBe(DIA_A);
  });

  test("cancela con motivo, deja auditoria y libera el horario", async ({ page, request }) => {
    const reserva = await crearReserva({
      dia: DIA_A,
      hora: "11:00",
      telefono: TELEFONOS[4] ?? "",
      nombre: "Paciente Cancelada 33D",
    });

    const antes = await slotsDeDia(request, DIA_A);
    expect(tieneHora(antes, DIA_A, "11:00")).toBe(false);

    await login(page);
    await page.goto(`/admin/reservas/${reserva.id}`);

    const motivo = page.locator('input[aria-label="Motivo de cancelaci\u00f3n"]');
    await motivo.fill(`${MARCA} el paciente no podra asistir`);
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();

    await expect(page.getByRole("status").filter({ hasText: "Cita cancelada" })).toBeVisible();

    const despues = await leerReserva(reserva.id);
    expect(despues.status).toBe("CANCELLED");

    const { data: eventos } = await supabasePruebas()
      .from("booking_events")
      .select("reason, actor")
      .eq("booking_id", reserva.id)
      .order("created_at");
    const cancelacion = (eventos ?? []).find((e) => e.reason.includes("cancelaci"));
    expect(cancelacion?.reason).toContain(`${MARCA} el paciente no podra asistir`);
    expect(cancelacion?.actor).toBe("admin");

    const { data: auditoria } = await supabasePruebas()
      .from("audit_logs")
      .select("action, after")
      .eq("entity_id", reserva.id)
      .eq("action", "reserva.cancelada");
    expect((auditoria ?? []).length).toBeGreaterThan(0);

    const despuesSlots = await slotsDeDia(request, DIA_A);
    expect(tieneHora(despuesSlots, DIA_A, "11:00")).toBe(true);
  });

  test("la cancelacion exige motivo y rechaza operaciones duplicadas", async ({ page }) => {
    const reserva = await crearReserva({
      dia: DIA_C,
      hora: "10:00",
      telefono: TELEFONOS[0] ?? "",
      nombre: "Paciente Duplicada 33D",
    });

    await login(page);
    await page.goto(`/admin/reservas/${reserva.id}`);
    await expect(page.getByRole("button", { name: "Cancelar", exact: true })).toBeDisabled();

    const owner = await clienteOwner();
    const { data: sinMotivo } = await owner.rpc("cancelar_reserva_admin", {
      p_booking_id: reserva.id,
      p_motivo: "  ",
    });
    expect(sinMotivo).toMatchObject({ ok: false, error: "motivo_requerido" });

    const { data: primera } = await owner.rpc("cancelar_reserva_admin", {
      p_booking_id: reserva.id,
      p_motivo: `${MARCA} primera`,
    });
    expect(primera).toMatchObject({ ok: true });

    const { data: segunda } = await owner.rpc("cancelar_reserva_admin", {
      p_booking_id: reserva.id,
      p_motivo: `${MARCA} segunda`,
    });
    expect(segunda).toMatchObject({ ok: false, error: "ya_cancelada" });
  });

  test("registra asistencia: asistio y no asistio con observacion", async ({ page }) => {
    const asistio = await crearReserva({
      dia: DIA_A,
      hora: "16:30",
      telefono: TELEFONOS[1] ?? "",
      nombre: "Paciente Asistio 33D",
    });
    const falto = await crearReserva({
      dia: DIA_B,
      hora: "16:30",
      telefono: TELEFONOS[2] ?? "",
      nombre: "Paciente Falto 33D",
    });

    await login(page);
    await page.goto(`/admin/reservas/${asistio.id}`);
    await page.getByLabel("Observaci\u00f3n de asistencia").first().fill(`${MARCA} llego puntual`);
    await page.getByRole("button", { name: /Marcar completada/ }).click();
    await expect(page.getByText("Atenci\u00f3n completada", { exact: true })).toBeVisible();

    const estadoAsistio = await leerReserva(asistio.id);
    expect(estadoAsistio.status).toBe("COMPLETED");

    await page.goto(`/admin/reservas/${falto.id}`);
    await page.getByLabel("Observaci\u00f3n de inasistencia").fill(`${MARCA} no llego`);
    await page.getByRole("button", { name: /Registrar inasistencia/ }).click();
    await expect(page.getByText("Inasistencia registrada", { exact: true })).toBeVisible();

    const estadoFalto = await leerReserva(falto.id);
    expect(estadoFalto.status).toBe("NO_SHOW");

    const { data: eventos } = await supabasePruebas()
      .from("booking_events")
      .select("reason")
      .eq("booking_id", asistio.id);
    expect((eventos ?? []).some((e) => e.reason.includes("asistencia registrada") && e.reason.includes(MARCA))).toBe(true);
  });

  test("las transiciones invalidas se rechazan en el servidor", async () => {
    const completada = await crearReserva({
      dia: DIA_C,
      hora: "16:00",
      telefono: TELEFONOS[3] ?? "",
      nombre: "Paciente Completada 33D",
    });
    const owner = await clienteOwner();

    const { data: asistencia } = await owner.rpc("registrar_asistencia_admin", {
      p_booking_id: completada.id,
      p_estado: "COMPLETED",
      p_motivo: `${MARCA} ok`,
    });
    expect(asistencia).toMatchObject({ ok: true });

    const { data: noShow } = await owner.rpc("registrar_asistencia_admin", {
      p_booking_id: completada.id,
      p_estado: "NO_SHOW",
      p_motivo: `${MARCA} invalido`,
    });
    expect(noShow).toMatchObject({ ok: false, error: "transicion_invalida" });

    const { data: repetir } = await owner.rpc("registrar_asistencia_admin", {
      p_booking_id: completada.id,
      p_estado: "COMPLETED",
      p_motivo: `${MARCA} repetir`,
    });
    expect(repetir).toMatchObject({ ok: false, error: "asistencia_ya_registrada" });

    const { data: cancelar } = await owner.rpc("cancelar_reserva_admin", {
      p_booking_id: completada.id,
      p_motivo: `${MARCA} sobre completada`,
    });
    expect(cancelar).toMatchObject({ ok: false, error: "estado_no_cancelable" });

    const { data: reprogramar } = await owner.rpc("reprogramar_reserva_admin", {
      p_booking_id: completada.id,
      p_inicio: `${DIA_B}T17:00:00-05:00`,
      p_motivo: `${MARCA} sobre completada`,
    });
    expect(reprogramar).toMatchObject({ ok: false, error: "estado_no_reprogramable" });

    const estado = await leerReserva(completada.id);
    expect(estado.status).toBe("COMPLETED");
  });

  test("acciones rapidas de asistencia desde /admin/agenda", async ({ page }) => {
    const reserva = await crearReserva({
      dia: DIA_A,
      hora: "17:00",
      telefono: TELEFONOS[4] ?? "",
      nombre: "Paciente Agenda 33D",
    });

    await login(page);
    await page.goto(`/admin/agenda?fecha=${DIA_A}`);

    const fila = page.locator("li").filter({ hasText: "Paciente Agenda 33D" });
    await fila.locator("summary").filter({ hasText: "Acciones de cita" }).click();
    await fila.getByLabel("Observaci\u00f3n de asistencia").fill(`${MARCA} desde agenda`);
    await fila.getByRole("button", { name: "No asisti\u00f3" }).click();

    await page.waitForURL(`**/admin/reservas/${reserva.id}*`);
    await expect(page.getByText("Inasistencia registrada", { exact: true })).toBeVisible();

    const estado = await leerReserva(reserva.id);
    expect(estado.status).toBe("NO_SHOW");
  });
});
