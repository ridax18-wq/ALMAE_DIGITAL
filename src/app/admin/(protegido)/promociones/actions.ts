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

const fechaISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (uso YYYY-MM-DD)")
  .optional()
  .or(z.literal(""));

const promocionSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .regex(/^[A-Z0-9-]+$/, "Código solo con mayúsculas, números y guiones"),
    kind: z.enum(["fixed", "percent"]),
    value: z.coerce.number().positive("El valor debe ser positivo"),
    service_id: z.string().uuid().optional().or(z.literal("")),
    valid_from: fechaISO,
    valid_to: fechaISO,
    max_uses: z.coerce.number().int().min(1).max(9999).optional().or(z.literal("")),
    image_media_id: z.string().uuid().optional().or(z.literal("")),
    sort_order: z.coerce.number().int().min(0).max(999).default(0),
    active: z.boolean(),
    published: z.boolean(),
  })
  .superRefine((dato, ctx) => {
    if (dato.kind === "percent" && dato.value > 100) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "El porcentaje no puede superar 100",
      });
    }
    if (dato.valid_from && dato.valid_to && dato.valid_to < dato.valid_from) {
      ctx.addIssue({
        code: "custom",
        path: ["valid_to"],
        message: "El vencimiento no puede ser anterior al inicio",
      });
    }
  });

export async function guardarPromocion(datos: FormData): Promise<void> {
  const usuario = await requerirAdmin();

  const parseo = promocionSchema.safeParse({
    code: datos.get("code"),
    kind: datos.get("kind"),
    value: datos.get("value"),
    service_id: datos.get("service_id") ?? "",
    valid_from: datos.get("valid_from") ?? "",
    valid_to: datos.get("valid_to") ?? "",
    max_uses: datos.get("max_uses") ?? "",
    image_media_id: datos.get("image_media_id") ?? "",
    sort_order: datos.get("sort_order") ?? 0,
    active: datos.get("active") === "on",
    published: datos.get("published") === "on",
  });

  if (!parseo.success) {
    redirect(
      `/admin/promociones?error=${encodeURIComponent(parseo.error.issues[0]?.message ?? "Datos inválidos")}`,
    );
  }

  const promo = parseo.data;
  const service = createSupabaseServiceClient();

  const promocionId = String(datos.get("promocion_id") ?? "");
  const esNueva = promocionId.length === 0;

  const { data: existente } = await service
    .from("promotions")
    .select("id")
    .eq("code", promo.code)
    .maybeSingle();
  if (existente && String(existente.id) !== promocionId) {
    redirect("/admin/promociones?error=codigo_duplicado");
  }

  const fila = {
    code: promo.code,
    kind: promo.kind,
    value: promo.value,
    service_id: promo.service_id || null,
    valid_from: promo.valid_from || null,
    valid_to: promo.valid_to || null,
    max_uses: promo.max_uses || null,
    image_media_id: promo.image_media_id || null,
    sort_order: promo.sort_order,
    active: promo.active,
    published: promo.published,
  };

  let id = promocionId;

  if (esNueva) {
    const { data: nueva, error } = await service
      .from("promotions")
      .insert(fila)
      .select("id")
      .single();
    if (error || !nueva) redirect("/admin/promociones?error=insertar");
    id = String(nueva.id);
  } else {
    const { error } = await service.from("promotions").update(fila).eq("id", id);
    if (error) redirect("/admin/promociones?error=actualizar");
  }

  await registrarAuditoria({
    actorUserId: usuario.id,
    actorRole: "owner",
    action: esNueva ? "promocion.creada" : "promocion.actualizada",
    entity: "promotions",
    entityId: id,
    after: fila,
  });

  revalidatePath("/admin/promociones");
  revalidatePath("/promociones");
  redirect(`/admin/promociones?guardada=1`);
}

export async function alternarPromocion(datos: FormData): Promise<void> {
  const usuario = await requerirAdmin();

  const id = String(datos.get("id") ?? "");
  const campo = String(datos.get("campo") ?? "");
  if (!id || (campo !== "active" && campo !== "published")) redirect("/admin/promociones");

  const service = createSupabaseServiceClient();
  const { data: promo } = await service
    .from("promotions")
    .select("id, active, published")
    .eq("id", id)
    .maybeSingle();
  if (!promo) redirect("/admin/promociones");

  const nuevo = !promo[campo as "active" | "published"];
  const { error } = await service.from("promotions").update({ [campo]: nuevo }).eq("id", id);
  if (error) redirect("/admin/promociones?error=alternar");

  await registrarAuditoria({
    actorUserId: usuario.id,
    actorRole: "owner",
    action: `promocion.${campo === "active" ? "activada" : "publicada"}`,
    entity: "promotions",
    entityId: id,
    after: { [campo]: nuevo },
  });

  revalidatePath("/admin/promociones");
  revalidatePath("/promociones");
  redirect("/admin/promociones");
}

export async function reordenarPromocion(datos: FormData): Promise<void> {
  await requerirAdmin();

  const id = String(datos.get("id") ?? "");
  const paso = Number(datos.get("paso") ?? 0);
  if (!id || (paso !== -1 && paso !== 1)) redirect("/admin/promociones");

  const service = createSupabaseServiceClient();
  const { data: actual } = await service
    .from("promotions")
    .select("id, sort_order")
    .eq("id", id)
    .maybeSingle();
  if (!actual) redirect("/admin/promociones");

  const destino = Math.max(0, Math.min(999, Number(actual.sort_order ?? 0) + paso));
  if (destino === Number(actual.sort_order ?? 0)) redirect("/admin/promociones");

  const { data: choque } = await service
    .from("promotions")
    .select("id")
    .eq("sort_order", destino)
    .maybeSingle();

  if (choque) {
    await service
      .from("promotions")
      .update({ sort_order: Number(actual.sort_order ?? 0) })
      .eq("id", choque.id);
  }

  await service.from("promotions").update({ sort_order: destino }).eq("id", id);

  revalidatePath("/admin/promociones");
  revalidatePath("/promociones");
  redirect("/admin/promociones");
}

export async function eliminarPromocion(datos: FormData): Promise<void> {
  const usuario = await requerirAdmin();

  const id = String(datos.get("id") ?? "");
  if (!id) redirect("/admin/promociones");

  const service = createSupabaseServiceClient();
  const { data: promo } = await service
    .from("promotions")
    .select("id, used_count")
    .eq("id", id)
    .maybeSingle();
  if (!promo) redirect("/admin/promociones");
  if (Number(promo.used_count) > 0) {
    redirect("/admin/promociones?error=con_usos");
  }

  const { error } = await service.from("promotions").delete().eq("id", id);
  if (error) redirect("/admin/promociones?error=eliminar");

  await registrarAuditoria({
    actorUserId: usuario.id,
    actorRole: "owner",
    action: "promocion.eliminada",
    entity: "promotions",
    entityId: id,
  });

  revalidatePath("/admin/promociones");
  revalidatePath("/promociones");
  redirect("/admin/promociones?eliminada=1");
}
