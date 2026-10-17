import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const emailDemo = "admin@almae.demo";
const passwordDemo = "DemoAlmae2026";

const resultados = [];

function registrar(nombre, ok, detalle) {
  resultados.push({ nombre, ok, detalle });
}

const anon = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: servicios, error: errorServicios } = await anon
  .from("services")
  .select("id, slug, name, active")
  .eq("active", true);

registrar(
  "anon lee servicios activos",
  !errorServicios && (servicios?.length ?? 0) === 10,
  `${servicios?.length ?? 0} filas${errorServicios ? ` | ${errorServicios.message}` : ""}`,
);

const { data: variantes, error: errorVariantes } = await anon
  .from("service_variants")
  .select("id, price");

registrar(
  "anon lee variantes de servicios activos",
  !errorVariantes && (variantes?.length ?? 0) === 10,
  `${variantes?.length ?? 0} filas${errorVariantes ? ` | ${errorVariantes.message}` : ""}`,
);

for (const tabla of [
  "patients",
  "bookings",
  "payments",
  "audit_logs",
  "admin_profiles",
]) {
  const { data, error } = await anon.from(tabla).select("*");
  registrar(
    `anon NO lee ${tabla}`,
    !error && (data?.length ?? 0) === 0,
    `${data?.length ?? 0} filas${error ? ` | ${error.message}` : ""}`,
  );
}

const { error: errorInsert } = await anon
  .from("patients")
  .insert({ full_name: "Intruso", phone: "999999999" });

registrar(
  "anon NO inserta en patients",
  Boolean(errorInsert),
  errorInsert ? errorInsert.message : "¡INSERT SIN RLS!",
);

const admin = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { error: errorLogin } = await admin.auth.signInWithPassword({
  email: emailDemo,
  password: passwordDemo,
});

registrar("admin inicia sesión", !errorLogin, errorLogin?.message ?? "ok");

const { data: reservasAdmin, error: errorReservasAdmin } = await admin
  .from("bookings")
  .select("*");

registrar(
  "admin autenticado lee bookings",
  !errorReservasAdmin && (reservasAdmin?.length ?? 0) === 0,
  `${reservasAdmin?.length ?? 0} filas${errorReservasAdmin ? ` | ${errorReservasAdmin.message}` : ""}`,
);

const serviceRole = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: settingsSrv, error: errorSettingsSrv } = await serviceRole
  .from("business_settings")
  .select("timezone, whatsapp_number")
  .limit(1);

registrar(
  "service-role lee configuración",
  !errorSettingsSrv && (settingsSrv?.length ?? 0) === 1,
  errorSettingsSrv?.message ?? "ok",
);

let fallas = 0;
for (const r of resultados) {
  if (!r.ok) fallas += 1;
  console.log(`${r.ok ? "PASS" : "FAIL"} | ${r.nombre} | ${r.detalle}`);
}

console.log(`\nRESULTADO: ${resultados.length - fallas}/${resultados.length} verificaciones OK`);
process.exit(fallas > 0 ? 1 : 0);
