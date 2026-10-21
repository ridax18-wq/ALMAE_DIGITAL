import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const anon = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SERVICIO = "terapia-fisica-y-rehabilitacion-consultorio";

const previos = await supabase
  .from("patients")
  .select("id")
  .eq("phone", "900000001");
const idsPrevios = (previos.data ?? []).map((p) => p.id);
if (idsPrevios.length) {
  await supabase.from("bookings").delete().in("patient_id", idsPrevios);
  await supabase.from("patients").delete().in("id", idsPrevios);
}

const { data: variant, error: errorVariante } = await supabase
  .from("service_variants")
  .select("id, service:services!inner(slug)")
  .eq("service.slug", SERVICIO)
  .limit(1)
  .maybeSingle();

if (!variant) throw new Error("Variante no encontrada: " + errorVariante?.message);

const dias = [];
for (let i = 1; i < 10; i += 1) {
  const f = new Date();
  f.setDate(f.getDate() + i);
  const dow = f.getDay();
  if (dow >= 1 && dow <= 5) {
    dias.push(f.toLocaleDateString("en-CA", { timeZone: "America/Lima" }));
    if (dias.length === 1) break;
  }
}

const fecha = dias[0];
if (!fecha) throw new Error("No hay día hábil disponible");

async function retener(hora) {
  return await anon.rpc("crear_retencion_web", {
    p_service_slug: SERVICIO,
    p_variant_id: variant.id,
    p_starts_at: `${fecha}T${hora}:00-05:00`,
    p_patient: {
      full_name: "Paciente Motor Test",
      phone: "900000001",
      email: "",
      notes: "",
      consent: false,
    },
  });
}

let exitos = 0;
let fallas = 0;
const resultados = await Promise.all(
  Array.from({ length: 5 }, () => retener("09:00")),
);
for (const r of resultados) {
  if (r.data?.ok) exitos += 1;
  else fallas += 1;
}
console.log(`CONCURRENCIA: ${exitos} creaciones OK, ${fallas} rechazadas (esperado: 1 y 4)`);
if (exitos !== 1 || fallas !== 4) {
  console.log("FALLO concurrencia:", JSON.stringify(resultados, null, 2));
  process.exit(1);
}

const exitosa = resultados.find((r) => r.data?.ok === true);
if (!exitosa) throw new Error("Ninguna retención creada");

const { data: vista } = await anon.rpc("obtener_reserva_por_token", {
  p_token: exitosa.data.token,
});
console.log(
  "TOKEN_VALIDO:",
  vista?.status === "HELD" ? "ok" : "fallo",
  vista?.status ?? "sin vista",
);

const tokenInvalido = "f".repeat(64);
const { data: invalida } = await anon.rpc("obtener_reserva_por_token", {
  p_token: tokenInvalido,
});
console.log("TOKEN_INVALIDO:", invalida === null || Object.keys(invalida ?? {}).length === 0 ? "ok (no encontrada)" : "fallo");

const idReserva = exitosa.data.id;

const { error: errorExpirar } = await supabase.from("bookings").update({
  hold_expires_at: new Date(Date.now() - 60_000).toISOString(),
}).eq("id", idReserva);
if (errorExpirar) throw new Error(errorExpirar.message);

const { data: expiradas } = await supabase.rpc("expirar_retenciones");
console.log("EXPIRACION: registros marcados =", Number(expiradas ?? 0) > 0 ? "ok" : "fallo");

const { data: final } = await supabase
  .from("bookings")
  .select("id, status")
  .eq("id", idReserva)
  .maybeSingle();
console.log("ESTADO_FINAL:", final?.status === "EXPIRED" ? "ok" : "fallo", final?.status ?? "");

await supabase.from("patients").delete().eq("phone", "900000001");

console.log("\nMOTOR_OK");
