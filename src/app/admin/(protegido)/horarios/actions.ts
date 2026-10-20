"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requerirOwner(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/admin/login");
  return auth.user.id;
}

export async function guardarSemanaLaboral(datos: FormData): Promise<void> {
  const userId = await requerirOwner();
  const service = createSupabaseServiceClient();

  const filas: {
    day_of_week: number;
    opens_at: string;
    closes_at: string;
    break_start: string | null;
    break_end: string | null;
  }[] = [];

  for (let iso = 1; iso <= 7; iso += 1) {
    const abre = String(datos.get(`d_${iso}_abre`) ?? "");
    const cierra = String(datos.get(`d_${iso}_cierra`) ?? "");
    const descansoDesde = String(datos.get(`d_${iso}_descanso_desde`) ?? "");
    const descansoHasta = String(datos.get(`d_${iso}_descanso_hasta`) ?? "");

    if (!abre && !cierra) continue;
    if (!abre || !cierra) {
      redirect("/admin/horarios?error=apertura_o_cierre_incompleto");
    }

    filas.push({
      day_of_week: iso,
      opens_at: `${abre}:00`,
      closes_at: `${cierra}:00`,
      break_start: descansoDesde ? `${descansoDesde}:00` : null,
      break_end: descansoHasta ? `${descansoHasta}:00` : null,
    });
  }

  if (filas.length === 0) {
    redirect("/admin/horarios?error=ningun_dia");
  }

  await service.from("business_hours").delete().neq("day_of_week", -1);

  const { error } = await service.from("business_hours").insert(filas);

  if (error) {
    redirect(`/admin/horarios?error=${encodeURIComponent(error.message)}`);
  }

  await service.from("audit_logs").insert({
    actor_user_id: userId,
    actor_role: "owner",
    action: "horarios.semana_guardada",
    entity: "business_hours",
    after: { dias: filas.length },
  });

  revalidatePath("/admin/horarios");
  revalidatePath("/reservar");
  redirect("/admin/horarios");
}
