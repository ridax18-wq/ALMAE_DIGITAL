"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { registrarAuditoria } from "@/lib/services/auditoria";

const configSchema = z.object({
  id: z.uuid(),
  booking_hold_ttl_minutes: z.coerce.number().int().min(1).max(120),
  booking_gap_minutes: z.coerce.number().int().min(0).max(60),
  min_booking_lead_hours: z.coerce.number().int().min(0).max(72),
  max_advance_days: z.coerce.number().int().min(1).max(365),
  cancellation_policy_hours: z.coerce.number().int().min(1).max(168),
  advance_percent: z.coerce.number().int().min(0).max(100),
  whatsapp_number: z.string().trim().regex(/^\d{8,15}$/, "Formato internacional sin + (ej: 51919608174)"),
  address_public: z.string().max(160),
});

export async function guardarConfiguracion(datos: FormData): Promise<void> {
  const parsed = configSchema.safeParse({
    id: datos.get("id"),
    booking_hold_ttl_minutes: datos.get("booking_hold_ttl_minutes"),
    booking_gap_minutes: datos.get("booking_gap_minutes"),
    min_booking_lead_hours: datos.get("min_booking_lead_hours"),
    max_advance_days: datos.get("max_advance_days"),
    cancellation_policy_hours: datos.get("cancellation_policy_hours"),
    advance_percent: datos.get("advance_percent"),
    whatsapp_number: datos.get("whatsapp_number"),
    address_public: datos.get("address_public"),
  });

  if (!parsed.success) {
    redirect(
      `/admin/configuracion?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Datos inválidos")}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/admin/login");

  const service = createSupabaseServiceClient();

  const { error } = await service
    .from("business_settings")
    .update({
      booking_hold_ttl_minutes: parsed.data.booking_hold_ttl_minutes,
      booking_gap_minutes: parsed.data.booking_gap_minutes,
      min_booking_lead_hours: parsed.data.min_booking_lead_hours,
      max_advance_days: parsed.data.max_advance_days,
      cancellation_policy_hours: parsed.data.cancellation_policy_hours,
      advance_percent: parsed.data.advance_percent,
      whatsapp_number: parsed.data.whatsapp_number,
      address_public: parsed.data.address_public,
    })
    .eq("id", parsed.data.id);

  if (error) {
    redirect(
      `/admin/configuracion?error=${encodeURIComponent(error.message)}`,
    );
  }

  await registrarAuditoria({
    actorUserId: auth.user.id,
    actorRole: "owner",
    action: "configuracion.actualizada",
    entity: "business_settings",
    entityId: parsed.data.id,
    after: parsed.data,
  });

  revalidatePath("/admin/configuracion");
  revalidatePath("/reservar");
  redirect("/admin/configuracion?guardado=1");
}

