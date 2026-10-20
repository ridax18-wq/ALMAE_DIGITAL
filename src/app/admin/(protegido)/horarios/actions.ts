"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { registrarAuditoria } from "@/lib/services/auditoria";

async function requerirAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/admin/login");
  return auth.user;
}

export async function guardarSemanaLaboral(datos: FormData): Promise<void> {
  const usuario = await requerirAdmin();
  const service = createSupabaseServiceClient();

  const filas: {
    weekday: number;
    opens_at: string;
    closes_at: string;
    break_start: string | null;
    break_end: string | null;
  }[] = [];

  for (let dia = 0; dia <= 6; dia += 1) {
    const abre = String(datos.get(`d_${dia}_abre`) ?? "");
    const cierra = String(datos.get(`d_${dia}_cierra`) ?? "");
    const descansoDesde = String(datos.get(`d_${dia}_descanso_desde`) ?? "");
    const descansoHasta = String(datos.get(`d_${dia}_descanso_hasta`) ?? "");

    if (!abre && !cierra) continue;
    if (!abre || !cierra) {
      redirect("/admin/horarios?error=apertura_o_cierre_incompleto");
    }

    filas.push({
      weekday: dia,
      opens_at: abre,
      closes_at: cierra,
      break_start: descansoDesde || null,
      break_end: descansoHasta || null,
    });
  }

  if (filas.length === 0) {
    redirect("/admin/horarios?error=ningun_dia");
  }

  await service.from("business_hours").delete().neq("weekday", -1);

  const { error } = await service.from("business_hours").insert(filas);

  if (error) {
    redirect(
      `/admin/horarios?error=${encodeURIComponent(error.message)}`,
    );
  }

  await registrarAuditoria({
    actorUserId: usuario.id,
    actorRole: "owner",
    action: "horarios.semana_guardada",
    entity: "business_hours",
    entityId: null,
    after: { dias: filas.length },
  });

  revalidatePath("/admin/horarios");
  revalidatePath("/reservar");
  redirect("/admin/horarios");
}

const bloqueoSchema = z.object({
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tipo: z.enum(["full_day", "holiday"]),
  motivo: z.string().max(120).optional(),
});

export async function crearBloqueoAgenda(datos: FormData): Promise<void> {
  const parsed = bloqueoSchema.safeParse({
    fecha_inicio: datos.get("fecha_inicio"),
    fecha_fin: datos.get("fecha_fin"),
    tipo: datos.get("tipo"),
    motivo: datos.get("motivo"),
  });

  if (!parsed.success) {
    redirect("/admin/horarios?error=datos_invalidos");
  }

  const usuario = await requerirAdmin();
  const service = createSupabaseServiceClient();

  const { error } = await service.from("schedule_exceptions").insert({
    kind: parsed.data.tipo,
    date_from: parsed.data.fecha_inicio,
    date_to: parsed.data.fecha_fin,
    reason: parsed.data.motivo ?? "",
    created_by: usuario.id,
  });

  if (error) {
    redirect(
      `/admin/horarios?error=${encodeURIComponent(error.message)}`,
    );
  }

  await registrarAuditoria({
    actorUserId: usuario.id,
    actorRole: "owner",
    action: "agenda.bloqueo_creado",
    entity: "schedule_exceptions",
    entityId: null,
    after: parsed.data,
  });

  revalidatePath("/admin/horarios");
  revalidatePath("/reservar");
  redirect("/admin/horarios");
}

export async function eliminarBloqueoAgenda(datos: FormData): Promise<void> {
  const id = z.uuid().safeParse(datos.get("excepcion_id"));
  if (!id.success) redirect("/admin/horarios?error=datos_invalidos");

  const usuario = await requerirAdmin();
  const service = createSupabaseServiceClient();

  await service.from("schedule_exceptions").delete().eq("id", id.data);

  await registrarAuditoria({
    actorUserId: usuario.id,
    actorRole: "owner",
    action: "agenda.bloqueo_eliminado",
    entity: "schedule_exceptions",
    entityId: id.data,
  });

  revalidatePath("/admin/horarios");
  revalidatePath("/reservar");
  redirect("/admin/horarios");
}

