"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { restaurarRevision } from "@/lib/cms/revisiones-historial";
import { registrarAuditoria } from "@/lib/services/auditoria";

export async function restaurarRevisionAction(datos: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/admin/login");

  if (datos.get("confirmar") !== "on") {
    redirect("/admin/revisiones?error=confirmacion_requerida");
  }

  const revisionId = String(datos.get("revision_id") ?? "");
  if (!revisionId) redirect("/admin/revisiones?error=id_invalido");

  const resultado = await restaurarRevision(revisionId, auth.user.id);
  if (!resultado.ok) {
    redirect(`/admin/revisiones?error=${encodeURIComponent(resultado.error ?? "error")}`);
  }

  await registrarAuditoria({
    actorUserId: auth.user.id,
    actorRole: "owner",
    action: "revision.restaurada",
    entity: "content_revision",
    entityId: revisionId,
  });

  if (resultado.revalidatePath) revalidatePath(resultado.revalidatePath);
  revalidatePath("/", "layout");
  revalidatePath("/admin/revisiones");
  redirect(`/admin/revisiones/${revisionId}?restaurada=1`);
}
