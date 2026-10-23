"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { esUrlMapsSegura } from "@/lib/cms/config-publica";
import { descartarBorrador, guardarBorrador, publicarBorrador } from "@/lib/cms/revisiones-config";
import { registrarAuditoria } from "@/lib/services/auditoria";

async function requerirAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/admin/login");
  return auth.user;
}

const ubicacionSchema = z
  .object({
    address_street: z.string().trim().min(3).max(120),
    address_district: z.string().trim().min(2).max(60),
    address_province: z.string().trim().min(2).max(60),
    address_department: z.string().trim().min(2).max(60),
    address_reference: z.string().trim().max(200).default(""),
    maps_url: z.string().trim().max(500).default(""),
    local_intro: z.string().trim().max(400).default(""),
  })
  .superRefine((dato, ctx) => {
    if (dato.maps_url && !esUrlMapsSegura(dato.maps_url)) {
      ctx.addIssue({
        code: "custom",
        path: ["maps_url"],
        message: "Enlace de Google Maps no válido (solo URLs https de Google Maps)",
      });
    }
  });

function parsear(datos: FormData) {
  return ubicacionSchema.safeParse({
    address_street: datos.get("address_street"),
    address_district: datos.get("address_district"),
    address_province: datos.get("address_province"),
    address_department: datos.get("address_department"),
    address_reference: datos.get("address_reference") ?? "",
    maps_url: datos.get("maps_url") ?? "",
    local_intro: datos.get("local_intro") ?? "",
  });
}

export async function guardarBorradorUbicacion(datos: FormData): Promise<void> {
  const usuario = await requerirAdmin();
  const parseo = parsear(datos);
  if (!parseo.success) {
    redirect(
      `/admin/ubicacion?error=${encodeURIComponent(parseo.error.issues[0]?.message ?? "Datos inválidos")}`,
    );
  }

  await guardarBorrador("ubicacion", parseo.data, usuario.id);
  await registrarAuditoria({
    actorUserId: usuario.id,
    actorRole: "owner",
    action: "ubicacion.borrador",
    entity: "business_settings",
    entityId: null,
    after: parseo.data,
  });

  revalidatePath("/admin/ubicacion");
  redirect("/admin/ubicacion?borrador=1");
}

export async function publicarUbicacion(): Promise<void> {
  const usuario = await requerirAdmin();
  const ok = await publicarBorrador("ubicacion", usuario.id);
  if (!ok) redirect("/admin/ubicacion?error=sin_borrador");

  await registrarAuditoria({
    actorUserId: usuario.id,
    actorRole: "owner",
    action: "ubicacion.publicada",
    entity: "business_settings",
    entityId: null,
  });

  revalidatePath("/admin/ubicacion");
  revalidatePath("/");
  revalidatePath("/contacto");
  redirect("/admin/ubicacion?publicada=1");
}

export async function descartarBorradorUbicacion(): Promise<void> {
  const usuario = await requerirAdmin();
  await descartarBorrador("ubicacion");
  await registrarAuditoria({
    actorUserId: usuario.id,
    actorRole: "owner",
    action: "ubicacion.borrador_descartado",
    entity: "business_settings",
    entityId: null,
  });

  revalidatePath("/admin/ubicacion");
  redirect("/admin/ubicacion?descartado=1");
}
