import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

process.env.NEXT_PUBLIC_ENV = "development";

const URL_LOCAL = "http://127.0.0.1:54321";
const SERVICIO = "terapia-fisica-y-rehabilitacion-consultorio";

const srv = createClient(URL_LOCAL, process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", {
  auth: { autoRefreshToken: false, persistSession: false },
});

const anon = createClient(URL_LOCAL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", {
  auth: { autoRefreshToken: false, persistSession: false },
});

let owner: SupabaseClient;
let VARIANT_ID = "";

function fechaFutura(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
}

function proximoDiaLaboral(desdeDias: number): string {
  for (let d = desdeDias; d < desdeDias + 14; d += 1) {
    const iso = fechaFutura(d);
    const dow = new Date(`${iso}T12:00:00-05:00`).getDay();
    if (dow >= 1 && dow <= 5) return iso;
  }
  return fechaFutura(desdeDias);
}

const FECHA = proximoDiaLaboral(9);

async function retener(hora: string, telefono: string) {
  return await anon.rpc("crear_retencion_web", {
    p_service_slug: SERVICIO,
    p_variant_id: VARIANT_ID,
    p_starts_at: `${FECHA}T${hora}:00-05:00`,
    p_patient: {
      full_name: "Paciente Hito22",
      phone: telefono,
      email: "",
      notes: "",
      consent: false,
    },
  });
}

async function limpiarAgenda() {
  await srv.from("bookings").delete().in("status", ["HELD", "PENDING_PAYMENT", "CONFIRMED", "EXPIRED"]);
  await srv.from("patients").delete().neq("phone", "INEXISTENTE");
  await srv
    .from("schedule_blocks")
    .delete()
    .in("block_type", ["BREAK", "INTERNAL", "ABSENCE", "MAINTENANCE", "OTHER"]);
}

describe("HITO 2.2 — pruebas SQL obligatorias", () => {
  beforeAll(async () => {
    const entorno = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    if (!entorno.includes("127.0.0.1")) {
      throw new Error("Estas pruebas solo corren contra el stack local");
    }

    owner = createClient(URL_LOCAL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: errorLogin } = await owner.auth.signInWithPassword({
      email: "admin@almae.demo",
      password: "DemoAlmae2026",
    });
    if (errorLogin) throw new Error("Login demo falló: " + errorLogin.message);

    const svc = (await srv.from("services").select("id").eq("slug", SERVICIO).maybeSingle()).data;
    if (!svc) throw new Error("Servicio no encontrado");
    const v = (await srv.from("service_variants").select("id").eq("service_id", svc.id).limit(1).maybeSingle()).data;
    if (!v) throw new Error("Variante no encontrada");
    VARIANT_ID = String(v.id);
  });

  afterEach(limpiarAgenda);

  it("T01: crea retención HELD válida con código público", async () => {
    const { data } = await retener("09:00", "900100001");
    expect(data?.ok).toBe(true);
    expect(String(data?.public_code)).toMatch(/^ALM-/);
    expect(String(data?.token)).toHaveLength(64);
  });

  it("T02: dos pacientes al mismo horario: uno gana, otro es rechazado", async () => {
    const primera = await retener("09:00", "900100001");
    expect(primera.data?.ok).toBe(true);

    const segunda = await retener("09:00", "900100002");
    expect(segunda.data?.ok).toBe(false);
    expect(segunda.data?.error).toBe("slot_no_disponible");
  });

  it("T03: permite citas consecutivas respetando el gap configurado", async () => {
    const primera = await retener("10:00", "900100003");
    expect(primera.data?.ok).toBe(true);

    const segunda = await retener("11:15", "900100003");
    expect(segunda.data?.ok).toBe(true);
  });

  it("T04/T05: expira la retención vencida y libera el horario", async () => {
    const { data: creada } = await retener("09:00", "900100004");
    expect(creada?.ok).toBe(true);

    await srv
      .from("bookings")
      .update({ hold_expires_at: new Date(Date.now() - 60_000).toISOString() })
      .eq("id", String(creada?.id));

    const { data: expiradas } = await srv.rpc("expirar_retenciones");
    expect(Number(expiradas ?? 0)).toBeGreaterThanOrEqual(1);

    const fila = (await srv.from("bookings").select("status").eq("id", String(creada?.id)).maybeSingle()).data;
    expect(fila?.status).toBe("EXPIRED");

    const { data: reutilizada } = await retener("09:00", "900100005");
    expect(reutilizada?.ok).toBe(true);
  });

  it("T06: rechaza confirmación de retención vencida", async () => {
    const { data: creada } = await retener("09:00", "900100006");
    expect(creada?.ok).toBe(true);

    await srv
      .from("bookings")
      .update({ hold_expires_at: new Date(Date.now() - 60_000).toISOString() })
      .eq("id", String(creada?.id));

    const { data: expiradas } = await srv.rpc("expirar_retenciones");
    expect(Number(expiradas ?? 0)).toBeGreaterThanOrEqual(1);

    const { data: confirmada } = await owner.rpc("confirmar_reserva_admin", {
      p_booking_id: creada?.id,
      p_motivo: "",
    });

    expect(confirmada?.ok).toBe(false);
    expect(confirmada?.error).toBe("estado_no_confirmable");
  });

  it("T08/T09: rechaza confirmación sin VERIFIED (0 o solo REPORTED)", async () => {
    const { data: creada } = await retener("11:00", "900100008");
    expect(creada?.ok).toBe(true);

    const { data: confirmadaSinPago } = await owner.rpc("confirmar_reserva_admin", {
      p_booking_id: creada?.id,
      p_motivo: "",
    });
    expect(confirmadaSinPago?.ok).toBe(false);
    expect(confirmadaSinPago?.error).toBe("adelante_insuficiente");

    await srv.from("manual_payments").insert({
      booking_id: String(creada?.id),
      method: "YAPE",
      amount_cents: 99000,
      verification_status: "REPORTED",
    });

    const { data: confirmadaConReported } = await owner.rpc("confirmar_reserva_admin", {
      p_booking_id: creada?.id,
      p_motivo: "",
    });
    expect(confirmadaConReported?.ok).toBe(false);
    expect(confirmadaConReported?.error).toBe("adelante_insuficiente");
  });

  it("T07/T14/T20/T22: VERIFIED suficiente confirma; idempotente; ocupa agenda; audita", async () => {
    const { data: creada } = await retener("11:00", "900100007");
    expect(creada?.ok).toBe(true);

    const { data: variante } = await srv
      .from("service_variants")
      .select("amount_cents")
      .eq("id", VARIANT_ID)
      .maybeSingle();
    const { data: settings } = await srv
      .from("business_settings")
      .select("advance_percent")
      .maybeSingle();
    const requerido = Math.round((Number(variante?.amount_cents) * Number(settings?.advance_percent ?? 40)) / 100);

    await srv.from("manual_payments").insert({
      booking_id: String(creada?.id),
      method: "YAPE",
      amount_cents: requerido,
      verification_status: "REPORTED",
      transaction_reference: "H22-T07",
    });

    await owner
      .from("manual_payments")
      .update({
        verification_status: "VERIFIED",
        verified_at: new Date().toISOString(),
      })
      .eq("transaction_reference", "H22-T07");

    const { data: confirmada } = await owner.rpc("confirmar_reserva_admin", {
      p_booking_id: creada?.id,
      p_motivo: "pago verificado en sistema",
    });
    expect(confirmada?.ok).toBe(true);
    expect(confirmada?.status).toBe("CONFIRMED");

    const { data: segunda } = await owner.rpc("confirmar_reserva_admin", {
      p_booking_id: creada?.id,
      p_motivo: "",
    });
    expect(segunda?.ok).toBe(true);
    expect(segunda?.ya_confirmada).toBe(true);

    const ocupacion = (
      await srv
        .from("agenda_occupancy")
        .select("id", { count: "exact" })
        .eq("booking_id", String(creada?.id))
        .eq("source", "BOOKING")
    ).count;
    expect(ocupacion).toBe(1);

    const auditoria = (
      await srv
        .from("audit_logs")
        .select("id", { count: "exact" })
        .eq("entity", "bookings")
        .eq("entity_id", String(creada?.id))
        .eq("action", "reserva.confirmada")
    ).count;
    expect(auditoria).toBe(1);
  });

  it("T10/T11: crea reserva presencial CONFIRMED y ocupa el horario", async () => {
    const { data } = await owner.rpc("crear_reserva_presencial", {
      p_entrada: {
        service_slug: SERVICIO,
        variant_id: VARIANT_ID,
        starts_at: `${FECHA}T16:00:00-05:00`,
        full_name: "Paciente Presencial",
        phone: "900100010",
        email: "",
        consent: true,
        notes: "",
        exencion_adelanto: true,
        motivo_exencion: "prueba de exención",
      },
    });

    expect(data?.ok).toBe(true);
    expect(data?.status).toBe("CONFIRMED");

    const ocupacion = (
      await srv
        .from("agenda_occupancy")
        .select("id")
        .eq("booking_id", String(data?.id))
        .eq("source", "BOOKING")
        .maybeSingle()
    ).data;
    expect(ocupacion).not.toBeNull();

    const { data: sobrePresencial } = await retener("16:00", "900100011");
    expect(sobrePresencial?.ok).toBe(false);
    expect(sobrePresencial?.error).toBe("slot_no_disponible");
  });

  it("T12/T13: crea bloqueo administrativo e impide retención en el rango", async () => {
    const { data: bloqueo } = await owner.rpc("crear_bloqueo_agenda", {
      p_inicio: `${FECHA}T12:00:00-05:00`,
      p_fin: `${FECHA}T13:00:00-05:00`,
      p_tipo: "INTERNAL",
      p_reason: "bloqueo de prueba",
    });

    expect(bloqueo?.ok).toBe(true);

    const { data: sobreBloqueo } = await retener("12:00", "900100013");
    expect(sobreBloqueo?.ok).toBe(false);
    expect(sobreBloqueo?.error).toBe("slot_no_disponible");
  });

  it("T15: bajo concurrencia real solo una retención gana", async () => {
    const intentos = await Promise.all(
      ["900100151", "900100152", "900100153", "900100154", "900100155"].map((tel) =>
        retener("17:00", tel),
      ),
    );

    const exitos = intentos.filter((i) => i.data?.ok === true).length;
    expect(exitos).toBe(1);
  });

  it("T16/T17/T18: RLS protege pacientes y pagos; anon no confirma", async () => {
    const pacientesAnon = await anon.from("patients").select("*");
    expect(pacientesAnon.data ?? []).toEqual([]);

    const pagosAnon = await anon.from("manual_payments").select("*");
    expect(pagosAnon.data ?? []).toEqual([]);

    const intento = await anon.rpc("confirmar_reserva_admin", {
      p_booking_id: "00000000-0000-0000-0000-000000000000",
      p_motivo: "",
    });

    if (intento.error) {
      expect(String(intento.error.message).length).toBeGreaterThan(0);
    } else {
      expect(intento.data).toMatchObject({ ok: false });
    }
  });

  it("T21: la misma referencia + método no se registra dos veces", async () => {
    const { data: creada } = await retener("11:00", "900100021");
    expect(creada?.ok).toBe(true);

    const primero = await srv.from("manual_payments").insert({
      booking_id: String(creada?.id),
      method: "PLIN",
      amount_cents: 2000,
      transaction_reference: "H22-DUP",
    });
    expect(primero.error).toBeNull();

    const segundo = await srv.from("manual_payments").insert({
      booking_id: String(creada?.id),
      method: "PLIN",
      amount_cents: 2000,
      transaction_reference: "H22-DUP",
    });
    expect(segundo.error).not.toBeNull();
  });

  it("T23: los montos históricos no cambian al actualizar la variante", async () => {
    const { data: creada } = await retener("18:00", "900100023");
    expect(creada?.ok).toBe(true);

    const antes = (await srv.from("bookings").select("amount_cents").eq("id", String(creada?.id)).maybeSingle()).data;

    await srv.from("service_variants").update({ amount_cents: 999999 }).eq("id", VARIANT_ID);

    const despues = (await srv.from("bookings").select("amount_cents").eq("id", String(creada?.id)).maybeSingle()).data;

    expect(despues?.amount_cents).toBe(antes?.amount_cents);

    await srv
      .from("service_variants")
      .update({ amount_cents: antes?.amount_cents ?? 5000 })
      .eq("id", VARIANT_ID);
  });
});
