// =====================================================================
// ALMAE DIGITAL — 4.3: verificación de ausencia de datos DEMO en la BD.
// Uso: node scripts/verificar-sin-demo.mjs
//   NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
//   SUPABASE_SERVICE_ROLE_KEY (opcional, para leer testimonios privados)
//   NEXT_PUBLIC_ENV=production  → además exige que admin@almae.demo NO
//   pueda autenticarse (bloqueo de código o cuenta inexistente).
// Sale con código 1 si alguna verificación obligatoria falla.
// =====================================================================
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

const envLocal = ".env.local";
if (existsSync(envLocal)) {
  for (const linea of readFileSync(envLocal, "utf8").split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const esProduccion = process.env.NEXT_PUBLIC_ENV === "production";

const resultados = [];

function registrar(nombre, ok, detalle, obligatorio = true) {
  resultados.push({ nombre, ok, detalle, obligatorio });
}

const anon = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: fuentes, error: errorFuentes } = await anon
  .from("marketing_sources")
  .select("name")
  .ilike("name", "%demo%");

registrar(
  "sin fuentes de marketing '(demo)'",
  !errorFuentes && (fuentes?.length ?? 0) === 0,
  errorFuentes
    ? errorFuentes.message
    : `${fuentes?.length ?? 0} fila(s) demo`,
);

const { data: servicios, error: errorServicios } = await anon
  .from("services")
  .select("slug, name, active")
  .eq("active", true);

const marcados = (servicios ?? []).filter((s) =>
  ["demo", "prueba", "test"].some(
    (p) => s.slug.toLowerCase().includes(p) || s.name.toLowerCase().includes(p),
  ),
);
registrar(
  "catálogo sembrado (al menos 10 servicios activos)",
  !errorServicios && (servicios?.length ?? 0) >= 10,
  errorServicios
    ? errorServicios.message
    : `${servicios?.length ?? 0} activos (mínimo esperado en producción: 10)`,
);
registrar(
  "sin servicios con marcas demo/prueba/test",
  !errorServicios && marcados.length === 0,
  errorServicios
    ? errorServicios.message
    : `${marcados.length} servicio(s): ${marcados.map((s) => s.name).join(", ")}`,
);

const { data: ajustes, error: errorAjustes } = await anon
  .from("business_settings")
  .select("address_public")
  .maybeSingle();

const direccionProvisional = Boolean(
  ajustes?.address_public?.toLowerCase().includes("provisional"),
);
registrar(
  "dirección oficial cargada (sin texto 'provisional')",
  !errorAjustes && !direccionProvisional,
  errorAjustes
    ? errorAjustes.message
    : `address_public=${ajustes?.address_public ?? "(vacío)"}`,
  esProduccion,
);

const { data: testimonios, error: errorTestimonios } = await anon
  .from("testimonials")
  .select("id, patient_consent, status")
  .eq("status", "published")
  .eq("patient_consent", false);

registrar(
  "ningún testimonio publicado sin consentimiento",
  !errorTestimonios && (testimonios?.length ?? 0) === 0,
  errorTestimonios
    ? errorTestimonios.message
    : `${testimonios?.length ?? 0} sin consentimiento`,
);

const { data: transiciones, error: errorTransiciones } = await anon.rpc(
  "bookings_valid_transitions",
);
registrar(
  "RPC bookings_valid_transitions denegada para anon",
  Boolean(errorTransiciones),
  errorTransiciones ? "denegada" : "¡ANON PUDO EJECUTARLA!",
);

if (serviceRoleKey) {
  const service = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: fuenteSvc, error: errorSvc } = await service
    .from("marketing_sources")
    .select("name")
    .ilike("name", "%demo%");
  registrar(
    "(service_role) sin fuentes demo",
    !errorSvc && (fuenteSvc?.length ?? 0) === 0,
    errorSvc ? errorSvc.message : `${fuenteSvc?.length ?? 0} fila(s) demo`,
  );
}

if (esProduccion) {
  const cliente = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: errorLogin } = await cliente.auth.signInWithPassword({
    email: "admin@almae.demo",
    password: "DemoAlmae2026",
  });
  registrar(
    "cuenta demo no autentica en producción",
    Boolean(errorLogin),
    errorLogin ? "login rechazado" : "¡LA CUENTA DEMO FUNCIONA EN PRODUCCIÓN!",
  );
}

let fallos = 0;
for (const r of resultados) {
  const estado = r.ok ? "PASS" : r.obligatorio ? "FAIL" : "AVISO";
  if (!r.ok && r.obligatorio) fallos += 1;
  console.log(`[${estado}] ${r.nombre} — ${r.detalle}`);
}

console.log(
  esProduccion
    ? "Modo: PRODUCCIÓN (todas las verificaciones obligatorias)."
    : "Modo: local (las verificaciones marcadas 'provisional' y de cuenta demo solo aplican con NEXT_PUBLIC_ENV=production).",
);

if (fallos > 0) {
  console.error(`${fallos} verificación(es) fallida(s).`);
  process.exit(1);
}
console.log("Verificación anti-DEMO: PASS.");
