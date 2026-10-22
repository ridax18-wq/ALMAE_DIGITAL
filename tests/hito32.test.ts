import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

process.env.NEXT_PUBLIC_ENV = "development";

const URL_LOCAL = "http://127.0.0.1:54321";
const SERVICIO = "terapia-fisica-y-rehabilitacion-consultorio";
const TELEFONO = "900032001";

const srv = createClient(URL_LOCAL, process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anon = createClient(URL_LOCAL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", {
  auth: { autoRefreshToken: false, persistSession: false },
});

let owner: SupabaseClient;
let VARIANT_ID = "";
let FECHA = "";
let reservaId = "";
let reservaSecundariaId = "";

function diaLaboralFuturo(desde: number): string {
  for (let d = desde; d < desde + 21; d += 1) {
    const f = new Date();
    f.setDate(f.getDate() + d);
    const iso = f.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
    const dow = new Date(`${iso}T12:00:00-05:00`).getDay();
    if (dow >= 1 && dow <= 5) return iso;
  }
  throw new Error("Sin día laboral");
}

async function retener(hora: string, telefono: string) {
  return anon.rpc("crear_retencion_web", {
    p_service_slug: SERVICIO,
    p_variant_id: VARIANT_ID,
    p_starts_at: `${FECHA}T${hora}:00-05:00`,
    p_patient: { full_name: "Paciente Ficticio A2", phone: telefono, email: "", notes: "", consent: false },
  });
}

async function limpiar() {
  const { data: pac } = await srv
    .from("patients")
    .select("id")
    .in("phone", [TELEFONO, "900032002", "900032999"]);
  const ids = (pac ?? []).map((p) => p.id);
  if (ids.length) {
    await srv.from("bookings").delete().in("patient_id", ids);
    await srv.from("patients").delete().in("id", ids);
  }
}

describe("HITO 3.2-A2 — confirmación, adelantos y extensión", () => {
  beforeAll(async () => {
    const entorno = process.env.NEXT_PUBLIC_SUPABASE_URL ?? URL_LOCAL;
    if (!entorno.includes("127.0.0.1")) throw new Error("Solo stack local");

    owner = createClient(URL_LOCAL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await owner.auth.signInWithPassword({
      email: "admin@almae.demo",
      password: "DemoAlmae2026",
    });
    if (error) throw new Error("Login owner demo falló: " + error.message);

    const svc = (await srv.from("services").select("id").eq("slug", SERVICIO).maybeSingle()).data;
    const v = (await srv.from("service_variants").select("id").eq("service_id", svc?.id ?? "").limit(1).maybeSingle()).data;
    if (!v) throw new Error("Variante no encontrada");
    VARIANT_ID = String(v.id);
    FECHA = diaLaboralFuturo(25);
    await limpiar();
  });

  afterAll(async () => {
    await limpiar();
  });

  it("T02: anónimo no puede confirmar reservas", async () => {
    await retener("17:00", TELEFONO).then((r) => {
      reservaId = String(r.data?.id ?? "");
    });
    const { data, error } = await anon.rpc("confirmar_reserva_admin", {
      p_booking_id: reservaId,
      p_motivo: "intento anónimo",
    });
    expect(error !== null || data?.ok !== true).toBe(true);
  });

  it("T04: la reserva HELD vigente aparece como retención pendiente", async () => {
    const { data } = await srv.from("bookings").select("status, hold_expires_at").eq("id", reservaId).maybeSingle();
    expect(data?.status).toBe("HELD");
    expect(new Date(String(data?.hold_expires_at)).getTime()).toBeGreaterThan(Date.now());
  });

  it("T08: sin adelanto verificado la confirmación se bloquea", async () => {
    const { data } = await owner.rpc("confirmar_reserva_admin", { p_booking_id: reservaId, p_motivo: "" });
    expect(data?.ok).toBe(false);
    expect(data?.error).toBe("adelante_insuficiente");
  });

  it("T06: un adelanto solo REPORTED no habilita la confirmación", async () => {
    await srv.from("manual_payments").insert({
      booking_id: reservaId,
      method: "YAPE",
      amount_cents: 2000,
      transaction_reference: "A2-REP-001",
      paid_at: new Date().toISOString(),
      verification_status: "REPORTED",
      notes: "ficticio",
    });
    const { data } = await owner.rpc("confirmar_reserva_admin", { p_booking_id: reservaId, p_motivo: "" });
    expect(data?.error).toBe("adelante_insuficiente");
  });

  it("T07/T10: adelanto verificado permite confirmar y cambia a CONFIRMED", async () => {
    const { error: errVer } = await owner
      .from("manual_payments")
      .update({ verification_status: "VERIFIED", verified_at: new Date().toISOString() })
      .eq("booking_id", reservaId)
      .eq("transaction_reference", "A2-REP-001");
    expect(errVer).toBeNull();

    const { data } = await owner.rpc("confirmar_reserva_admin", { p_booking_id: reservaId, p_motivo: "prueba A2" });
    expect(data?.ok).toBe(true);
    expect(data?.status).toBe("CONFIRMED");

    const { data: publico } = await anon.rpc("obtener_reserva_por_token", { p_token: "0".repeat(64) });
    expect(publico).toBeNull();
    const { data: fila } = await srv.from("bookings").select("status, confirmed_at").eq("id", reservaId).maybeSingle();
    expect(fila?.status).toBe("CONFIRMED");
    expect(fila?.confirmed_at).not.toBeNull();
  });

  it("T09: confirmar dos veces no duplica eventos ni cambia el estado", async () => {
    const { data } = await owner.rpc("confirmar_reserva_admin", { p_booking_id: reservaId, p_motivo: "repetida" });
    expect(data?.ok).toBe(true);
    const { data: eventos } = await srv
      .from("booking_events")
      .select("id")
      .eq("booking_id", reservaId)
      .eq("to_status", "CONFIRMED");
    expect((eventos ?? []).length).toBe(1);
  });

  it("T11: el horario confirmado sigue ocupado para una nueva retención", async () => {
    const r = await retener("17:00", "900032002");
    expect(r.data?.ok).toBe(false);
    expect(r.data?.error).toBe("slot_no_disponible");
  });

  it("T16: la confirmación deja registro de auditoría", async () => {
    const { data } = await srv
      .from("audit_logs")
      .select("action")
      .eq("entity_id", reservaId)
      .eq("action", "reserva.confirmada");
    expect((data ?? []).length).toBeGreaterThanOrEqual(1);
  });

  it("T14: la extensión acumulada no supera el máximo configurado", async () => {
    const { data: settings } = await srv.from("business_settings").select("max_hold_extension_minutes").limit(1).maybeSingle();
    const max = Number(settings?.max_hold_extension_minutes ?? 30);

    const r2 = await retener("09:00", TELEFONO);
    reservaSecundariaId = String(r2.data?.id ?? "");
    expect(r2.data?.ok).toBe(true);

    const primera = await owner.rpc("extender_retencion", {
      p_booking_id: reservaSecundariaId,
      p_minutos_extra: max,
      p_motivo: "prueba acumulado",
    });
    expect(primera.data?.ok).toBe(true);

    const segunda = await owner.rpc("extender_retencion", {
      p_booking_id: reservaSecundariaId,
      p_minutos_extra: 5,
      p_motivo: "exceso",
    });
    expect(segunda.data?.ok).toBe(false);
    expect(segunda.data?.error).toBe("extension_excede_maximo");
    expect(segunda.data?.disponible_minutos).toBe(0);
  });

  it("T05: una retención vencida no puede confirmarse", async () => {
    await srv
      .from("bookings")
      .update({ hold_expires_at: new Date(Date.now() - 60_000).toISOString() })
      .eq("id", reservaSecundariaId);
    const { data } = await owner.rpc("confirmar_reserva_admin", { p_booking_id: reservaSecundariaId, p_motivo: "" });
    expect(data?.ok).toBe(false);
    expect(["retencion_expirada", "estado_no_confirmable"]).toContain(data?.error);
  });
});
