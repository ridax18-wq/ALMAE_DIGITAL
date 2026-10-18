import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function cargarEnvLocal(): void {
  try {
    for (const linea of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const match = linea.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && match[1] && match[2] !== undefined && !process.env[match[1]]) {
        process.env[match[1]] = match[2];
      }
    }
  } catch {
    return;
  }
}

export function supabasePruebas(): SupabaseClient {
  cargarEnvLocal();
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/** Vacia la agenda del stack local para que las pruebas partan deterministas. */
export async function limpiarAgendaLocal(): Promise<void> {
  const supabase = supabasePruebas();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  if (!url.includes("127.0.0.1")) {
    throw new Error("La limpieza de pruebas solo corre contra el stack local");
  }

  await supabase.from("bookings").delete().neq("status", "INEXISTENTE");
  await supabase.from("patients").delete().neq("full_name", "INEXISTENTE");
}
