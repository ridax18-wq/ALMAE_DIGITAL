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

const testimonioSchema = z
  .object({
    patient_name: z.string().trim().min(2).max(80),
    quote: z.string().trim().min(10).max(500),
    rating: z.coerce.number().int().min(1).max(5).optional().or(z.literal("")),
    media_id: z.string().uuid().optional().or(z.literal("")),
    patient_consent: z.boolean(),
    status: z.enum(["draft", "published"]),
  })
  .superRefine((dato, ctx) => {
    if (dato.status === "published" && !dato.patient_consent) {
      ctx.addIssue({
        code: "custom",
        path: ["patient_consent"],
        message: "No se puede publicar sin consentimiento del paciente",
      });
    }
  });

export async function guardarTestimonio(datos: FormData): Promise<void> {
  const usuario = await requerirAdmin();

  const parseo = testimonioSchema.safeParse({
    patient_name: datos.get("patient_name"),
    quote: datos.get("quote"),
    rating: datos.get("rating") ?? "",
    media_id: datos.get("media_id") ?? "",
    patient_consent: datos.get("patient_consent") === "on",
    status: datos.get("status") === "published" ? "published" : "draft",
  });

  if (!parseo.success) {
    redirect(
      `/admin/testimonios?error=${encodeURIComponent(parseo.error.issues[0]?.message ?? "Datos inválidos")}`,
    );
  }

  const t = parseo.data;
  const service = createSupabaseServiceClient();
  const testimonioId = String(datos.get("testimonio_id") ?? "");
  const esNuevo = testimonioId.length === 0;

  const fila = {
    patient_name: t.patient_name,
    quote: t.quote,
    rating: t.rating === "" ? null : t.rating,
    media_id: t.media_id || null,
    patient_consent: t.patient_consent,
    consent_at: t.patient_consent ? new Date().toISOString() : null,
    status: t.status,
    created_by: usuario.id,
  };

  let id = testimonioId;

  if (esNuevo) {
    const { data: nuevo, error } = await service
      .from("testimonials")
      .insert(fila)
      .select("id")
      .single();
    if (error || !nuevo) redirect("/admin/testimonios?error=insertar");
    id = String(nuevo.id);
  } else {
    const { error } = await service.from("testimonials").update(fila).eq("id", id);
    if (error) redirect("/admin/testimonios?error=actualizar");
  }

  await registrarAuditoria({
    actorUserId: usuario.id,
    actorRole: "owner",
    action: esNuevo ? "testimonio.creado" : "testimonio.actualizado",
    entity: "testimonials",
    entityId: id,
    after: { ...fila, consent_at: undefined },
  });

  revalidatePath("/admin/testimonios");
  revalidatePath("/");
  redirect(`/admin/testimonios?guardado=1`);
}

export async function alternarTestimonio(datos: FormData): Promise<void> {
  const usuario = await requerirAdmin();

  const id = String(datos.get("id") ?? "");
  if (!id) redirect("/admin/testimonios");

  const service = createSupabaseServiceClient();
  const { data: t } = await service
    .from("testimonials")
    .select("id, status, patient_consent")
    .eq("id", id)
    .maybeSingle();
  if (!t) redirect("/admin/testimonios");

  if (t.status === "published") {
    const { error } = await service.from("testimonials").update({ status: "draft" }).eq("id", id);
    if (error) redirect("/admin/testimonios?error=alternar");
  } else {
    if (!t.patient_consent) {
      redirect("/admin/testimonios?error=sin_consentimiento");
    }
    const { error } = await service
      .from("testimonials")
      .update({ status: "published", consent_at: new Date().toISOString() })
      .eq("id", id);
    if (error) redirect("/admin/testimonios?error=alternar");
  }

  await registrarAuditoria({
    actorUserId: usuario.id,
    actorRole: "owner",
    action: "testimonio.estado",
    entity: "testimonials",
    entityId: id,
    after: { status: t.status === "published" ? "draft" : "published" },
  });

  revalidatePath("/admin/testimonios");
  revalidatePath("/");
  redirect("/admin/testimonios");
}

export async function eliminarTestimonio(datos: FormData): Promise<void> {
  const usuario = await requerirAdmin();

  const id = String(datos.get("id") ?? "");
  if (!id) redirect("/admin/testimonios");

  const service = createSupabaseServiceClient();
  const { error } = await service.from("testimonials").delete().eq("id", id);
  if (error) redirect("/admin/testimonios?error=eliminar");

  await registrarAuditoria({
    actorUserId: usuario.id,
    actorRole: "owner",
    action: "testimonio.eliminado",
    entity: "testimonials",
    entityId: id,
  });

  revalidatePath("/admin/testimonios");
  revalidatePath("/");
  redirect("/admin/testimonios?eliminado=1");
}
