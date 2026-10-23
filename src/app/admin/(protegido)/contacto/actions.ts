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

const soloHttps = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || (v.startsWith("https://") && !v.includes(" ")), {
    message: "Los enlaces deben ser URLs https válidas",
  });

const contactoSchema = z.object({
  whatsapp_number: z
    .string()
    .trim()
    .regex(/^\d{8,15}$/, "WhatsApp solo con dígitos, 8 a 15 caracteres"),
  whatsapp_message: z.string().trim().max(300).default(""),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\+?[\d\s()-]{7,20}$/.test(v), {
      message: "Teléfono inválido",
    }),
  email: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: "Correo inválido",
    }),
  instagram_url: soloHttps,
  facebook_url: soloHttps,
});

function parsear(datos: FormData) {
  return contactoSchema.safeParse({
    whatsapp_number: datos.get("whatsapp_number"),
    whatsapp_message: datos.get("whatsapp_message") ?? "",
    phone: datos.get("phone") ?? "",
    email: datos.get("email") ?? "",
    instagram_url: datos.get("instagram_url") ?? "",
    facebook_url: datos.get("facebook_url") ?? "",
  });
}

export async function guardarBorradorContacto(datos: FormData): Promise<void> {
  const usuario = await requerirAdmin();
  const parseo = parsear(datos);
  if (!parseo.success) {
    redirect(
      `/admin/contacto?error=${encodeURIComponent(parseo.error.issues[0]?.message ?? "Datos inválidos")}`,
    );
  }

  await guardarBorrador("contacto", parseo.data, usuario.id);
  await registrarAuditoria({
    actorUserId: usuario.id,
    actorRole: "owner",
    action: "contacto.borrador",
    entity: "business_settings",
    entityId: null,
    after: parseo.data,
  });

  revalidatePath("/admin/contacto");
  redirect("/admin/contacto?borrador=1");
}

export async function publicarContacto(): Promise<void> {
  const usuario = await requerirAdmin();
  const ok = await publicarBorrador("contacto", usuario.id);
  if (!ok) redirect("/admin/contacto?error=sin_borrador");

  await registrarAuditoria({
    actorUserId: usuario.id,
    actorRole: "owner",
    action: "contacto.publicado",
    entity: "business_settings",
    entityId: null,
  });

  revalidatePath("/admin/contacto");
  revalidatePath("/");
  revalidatePath("/contacto");
  redirect("/admin/contacto?publicado=1");
}

export async function descartarBorradorContacto(): Promise<void> {
  const usuario = await requerirAdmin();
  await descartarBorrador("contacto");
  await registrarAuditoria({
    actorUserId: usuario.id,
    actorRole: "owner",
    action: "contacto.borrador_descartado",
    entity: "business_settings",
    entityId: null,
  });

  revalidatePath("/admin/contacto");
  redirect("/admin/contacto?descartado=1");
}
