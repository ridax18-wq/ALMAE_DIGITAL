import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    "Definir NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local antes de crear el usuario demo",
  );
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: creado, error: errorCrear } = await supabase.auth.admin.createUser({
  email: "admin@almae.demo",
  password: "DemoAlmae2026",
  email_confirm: true,
  user_metadata: { display_name: "Dueño ALMAE (demo)" },
});

if (errorCrear && !String(errorCrear.message).includes("already")) {
  throw errorCrear;
}

const userId =
  creado?.user?.id ??
  (await supabase.auth.admin.listUsers()).data?.users?.find(
    (u) => u.email === "admin@almae.demo",
  )?.id;

if (!userId) throw new Error("No se pudo determinar el user_id demo");

const { error: errorPerfil } = await supabase
  .from("admin_profiles")
  .upsert({ user_id: userId, display_name: "Dueño ALMAE (demo)", role: "owner" });

if (errorPerfil) throw errorPerfil;

console.log("USUARIO_DEMO_OK", userId);
