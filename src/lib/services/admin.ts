import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function esAdministrador(userId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .limit(1);

  return (data?.length ?? 0) > 0;
}

export async function obtenerPerfilAdministrador(
  userId: string,
): Promise<{ display_name: string; role: string } | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("admin_profiles")
    .select("display_name, role")
    .eq("user_id", userId)
    .limit(1);

  return data?.[0] ?? null;
}
