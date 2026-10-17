import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: variant, error: errorVariante } = await supabase
  .from("service_variants")
  .select("id, service:services!inner(slug)")
  .eq("service.slug", "terapia-fisica-y-rehabilitacion-consultorio")
  .limit(1)
  .maybeSingle();

if (!variant) throw new Error("Variante no encontrada: " + errorVariante?.message);

const dias = [];
for (let i = 0; i < 7; i += 1) {
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

async function crearHold(slotHora) {
  const { data, error } = await supabase.rpc("crear_reserva_con_hold", {
    p_service_slug: "terapia-fisica-y-rehabilitacion-consultorio",
    p_variant_id: variant.id,
    p_starts_at: `${fecha}T${slotHora}:00-05:00`,
    p_patient: {
      full_name: "Paciente Motor Test",
      phone: "900000001",
      email: "",
      notes: "",
      consent: false,
    },
  });
  return { data, error };
}

let exitos = 0;
let fallas = 0;
const resultados = await Promise.all(
  ["09:00", "09:00", "09:00", "09:00", "09:00"].map(() => crearHold("09:00")),
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

const { data: vista } = await supabase.rpc("obtener_reserva_por_token", {
  p_token: resultados[0].data.token,
});
console.log(
  "TOKEN_VALIDO:",
  vista?.status === "HELD" ? "ok" : "fallo",
  vista?.status ?? "sin vista",
);

const { data: invalida } = await supabase.rpc("obtener_reserva_por_token", {
  p_token: "f".repeat(64),
});
console.log("TOKEN_INVALIDO:", invalida === null || Object.keys(invalida ?? {}).length === 0 ? "ok (no encontrada)" : "fallo");

const idReserva = resultados[0].data.id;

await supabase
  .from("bookings")
  .update({
    starts_at: `${fecha}T10:00:00-05:00`,
    ends_at: `${fecha}T11:00:00-05:00`,
    expires_at: new Date(Date.now() - 60_000).toISOString(),
  })
  .eq("id", idReserva);

const { data: expiradas } = await supabase.rpc("expirar_holds");
console.log("EXPIRACION: registros marcados =", Number(expiradas ?? 0) > 0 ? "ok" : "fallo");

const { data: slotLiberado } = await supabase
  .from("bookings")
  .select("id, status")
  .eq("id", idReserva)
  .maybeSingle();
console.log("ESTADO_FINAL:", slotLiberado?.status === "EXPIRED" ? "ok" : "fallo", slotLiberado?.status ?? "");

console.log("\nMOTOR_OK");
