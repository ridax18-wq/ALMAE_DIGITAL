"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { registrarAuditoria } from "@/lib/services/auditoria";

async function requerirAdmin(): Promise<{ userId: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/admin/login");
  return { userId: auth.user.id };
}

const notasSchema = z.object({
  paciente_id: z.uuid(),
  notas: z.string().max(500),
});

export async function guardarNotasPaciente(datos: FormData): Promise<void> {
  const parsed = notasSchema.safeParse({
    paciente_id: datos.get("paciente_id"),
    notas: datos.get("notas") ?? "",
  });
  if (!parsed.success) redirect("/admin/pacientes?error=datos_invalidos");

  const { userId } = await requerirAdmin();
  const service = createSupabaseServiceClient();

  await service
    .from("patients")
    .update({ notes_admin: parsed.data.notas })
    .eq("id", parsed.data.paciente_id);

  await registrarAuditoria({
    actorUserId: userId,
    actorRole: "owner",
    action: "paciente.notas_guardadas",
    entity: "patients",
    entityId: parsed.data.paciente_id,
  });

  revalidatePath(`/admin/pacientes/${parsed.data.paciente_id}`);
  redirect(`/admin/pacientes/${parsed.data.paciente_id}?guardado=1`);
}

const consentSchema = z.object({
  paciente_id: z.uuid(),
  consent: z.string().optional(),
});

export async function cambiarConsentimiento(datos: FormData): Promise<void> {
  const parsed = consentSchema.safeParse({
    paciente_id: datos.get("paciente_id"),
    consent: datos.get("consent"),
  });
  if (!parsed.success) redirect("/admin/pacientes?error=datos_invalidos");

  const { userId } = await requerirAdmin();
  const service = createSupabaseServiceClient();

  const autoriza = parsed.data.consent === "on";

  await service
    .from("patients")
    .update({
      contact_consent: autoriza,
      consent_at: autoriza ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.paciente_id);

  await registrarAuditoria({
    actorUserId: userId,
    actorRole: "owner",
    action: "paciente.consentimiento_actualizado",
    entity: "patients",
    entityId: parsed.data.paciente_id,
    after: { contact_consent: autoriza },
  });

  revalidatePath(`/admin/pacientes/${parsed.data.paciente_id}`);
  redirect(`/admin/pacientes/${parsed.data.paciente_id}?guardado=1`);
}

