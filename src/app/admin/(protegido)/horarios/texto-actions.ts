"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { descartarBorrador, guardarBorrador, publicarBorrador } from "@/lib/cms/revisiones-config";
import { registrarAuditoria } from "@/lib/services/auditoria";

async function requerirAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/admin/login");
  return auth.user;
}

const notaHorarioSchema = z.object({
  hours_note: z.string().trim().max(400).default(""),
});

export async function guardarBorradorHorarioTexto(datos: FormData): Promise<void> {
  const usuario = await requerirAdmin();
  const parseo = notaHorarioSchema.safeParse({
    hours_note: datos.get("hours_note") ?? "",
  });
  if (!parseo.success) {
    redirect(
      `/admin/horarios?error=${encodeURIComponent(parseo.error.issues[0]?.message ?? "Datos inválidos")}`,
    );
  }

  await guardarBorrador("horarios", parseo.data, usuario.id);
  await registrarAuditoria({
    actorUserId: usuario.id,
    actorRole: "owner",
    action: "horarios.texto_borrador",
    entity: "business_settings",
    entityId: null,
    after: parseo.data,
  });

  revalidatePath("/admin/horarios");
  redirect("/admin/horarios?borrador=1");
}

export async function publicarHorarioTexto(): Promise<void> {
  const usuario = await requerirAdmin();
  const ok = await publicarBorrador("horarios", usuario.id);
  if (!ok) redirect("/admin/horarios?error=sin_borrador");

  await registrarAuditoria({
    actorUserId: usuario.id,
    actorRole: "owner",
    action: "horarios.texto_publicado",
    entity: "business_settings",
    entityId: null,
  });

  revalidatePath("/admin/horarios");
  revalidatePath("/");
  revalidatePath("/contacto");
  redirect("/admin/horarios?publicado=1");
}

export async function descartarBorradorHorarioTexto(): Promise<void> {
  const usuario = await requerirAdmin();
  await descartarBorrador("horarios");
  await registrarAuditoria({
    actorUserId: usuario.id,
    actorRole: "owner",
    action: "horarios.texto_descartado",
    entity: "business_settings",
    entityId: null,
  });
  revalidatePath("/admin/horarios");
  redirect("/admin/horarios?descartado=1");
}
