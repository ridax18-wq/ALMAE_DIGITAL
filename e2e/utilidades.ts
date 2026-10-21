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

  await supabase.from("bookings").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("schedule_blocks").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("patients").delete().neq("phone", "INEXISTENTE");
}

/** Recorre hasta 5 fechas siguientes hasta encontrar un día con slots. */
export async function encontrarDiaConHorarios(
  page: import("@playwright/test").Page,
): Promise<boolean> {
  for (let desplazamiento = 0; desplazamiento < 5; desplazamiento += 1) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + desplazamiento);
    const iso = fecha.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
    await page.fill("#fecha", iso);
    await page.getByRole("button", { name: "Ver horarios" }).click();
    await page.waitForTimeout(700);
    if ((await page.locator("fieldset button").count()) > 0) return true;
  }
  return false;
}

/** Elige un horario estable (18:00) o el último disponible. */
export async function elegirHorarioEstable(
  page: import("@playwright/test").Page,
): Promise<void> {
  const chips = page.locator("fieldset button");
  const chipEstable = chips.filter({ hasText: "18:00" });
  if ((await chipEstable.count()) > 0) {
    await chipEstable.first().click();
  } else {
    await chips.last().click();
  }
}
