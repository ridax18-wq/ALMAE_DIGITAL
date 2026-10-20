"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { TRANSICIONES_ADMIN } from "@/lib/services/estados";
import { registrarAuditoria } from "@/lib/services/auditoria";

const cambioEstadoSchema = z.object({
  booking_id: z.uuid(),
  nuevo_estado: z.enum([
    "CONFIRMED",
    "COMPLETED",
    "NO_SHOW",
    "CANCELLED",
    "REFUND_PENDING",
    "REFUNDED",
  ]),
});

export async function cambiarEstadoReserva(datos: FormData): Promise<void> {
  const parsed = cambioEstadoSchema.safeParse({
    booking_id: datos.get("booking_id"),
    nuevo_estado: datos.get("nuevo_estado"),
  });

  if (!parsed.success) {
    redirect("/admin/reservas?error=datos_invalidos");
  }

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/admin/login");

  const service = createSupabaseServiceClient();

  const { data: reserva } = await service
    .from("bookings")
    .select("id, status")
    .eq("id", parsed.data.booking_id)
    .maybeSingle();

  if (!reserva) {
    redirect("/admin/reservas?error=no_encontrada");
  }

  const permitidas = TRANSICIONES_ADMIN[reserva.status] ?? [];
  if (!permitidas.some((t) => t.a === parsed.data.nuevo_estado)) {
    redirect(
      `/admin/reservas/${reserva.id}?error=transicion_invalida`,
    );
  }

  const { error } = await service
    .from("bookings")
    .update({ status: parsed.data.nuevo_estado })
    .eq("id", reserva.id);

  if (error) {
    redirect(`/admin/reservas/${reserva.id}?error=transicion_rechazada`);
  }

  await registrarAuditoria({
    actorUserId: auth.user.id,
    actorRole: "owner",
    action: `reserva.${parsed.data.nuevo_estado.toLowerCase()}`,
    entity: "bookings",
    entityId: reserva.id,
    before: { status: reserva.status },
    after: { status: parsed.data.nuevo_estado },
  });

  revalidatePath(`/admin/reservas/${reserva.id}`);
  revalidatePath("/admin/reservas");
  redirect(`/admin/reservas/${reserva.id}`);
}

const pagoManualSchema = z.object({
  booking_id: z.uuid(),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  metodo: z.enum(["efectivo", "yape", "plin", "transferencia"]),
  nota: z.string().max(200).optional(),
});

export async function registrarPagoManual(datos: FormData): Promise<void> {
  const parsed = pagoManualSchema.safeParse({
    booking_id: datos.get("booking_id"),
    monto: datos.get("monto"),
    metodo: datos.get("metodo"),
    nota: datos.get("nota"),
  });

  if (!parsed.success) {
    redirect(
      `/admin/reservas/${datos.get("booking_id")}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "datos inválidos")}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/admin/login");

  const service = createSupabaseServiceClient();

  const { data: reserva } = await service
    .from("bookings")
    .select("id, status, currency")
    .eq("id", parsed.data.booking_id)
    .maybeSingle();

  if (!reserva) {
    redirect("/admin/reservas?error=no_encontrada");
  }

  const referencia = `manual_${reserva.id}_${Date.now()}`;

  const { data: pago, error: errorPago } = await service
    .from("payments")
    .insert({
      booking_id: reserva.id,
      provider: "manual",
      external_reference: referencia,
      amount: parsed.data.monto,
      currency: reserva.currency,
      status: "SUCCEEDED",
      method: parsed.data.metodo,
      occurred_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (errorPago) {
    redirect(
      `/admin/reservas/${reserva.id}?error=${encodeURIComponent("No se pudo registrar el pago")}`,
    );
  }

  if (["HELD", "PENDING_PAYMENT"].includes(reserva.status)) {
    await service
      .from("bookings")
      .update({ status: "CONFIRMED" })
      .eq("id", reserva.id);
  }

  await registrarAuditoria({
    actorUserId: auth.user.id,
    actorRole: "owner",
    action: "pago.manual_registrado",
    entity: "payments",
    entityId: pago?.id ?? null,
    after: { booking_id: reserva.id, monto: parsed.data.monto, metodo: parsed.data.metodo },
  });

  revalidatePath(`/admin/reservas/${reserva.id}`);
  revalidatePath("/admin/pagos");
  redirect(`/admin/reservas/${reserva.id}`);
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

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/admin/login");

  const service = createSupabaseServiceClient();

  const { error } = await service.from("schedule_exceptions").insert({
    kind: parsed.data.tipo,
    date_from: parsed.data.fecha_inicio,
    date_to: parsed.data.fecha_fin,
    reason: parsed.data.motivo ?? "",
    created_by: auth.user.id,
  });

  if (error) {
    redirect("/admin/horarios?error=insertar");
  }

  await registrarAuditoria({
    actorUserId: auth.user.id,
    actorRole: "owner",
    action: "agenda.bloqueo_creado",
    entity: "schedule_exceptions",
    entityId: null,
    after: parsed.data,
  });

  revalidatePath("/admin/horarios");
  redirect("/admin/horarios");
}

export async function eliminarBloqueoAgenda(datos: FormData): Promise<void> {
  const id = z.uuid().safeParse(datos.get("excepcion_id"));
  if (!id.success) redirect("/admin/horarios?error=datos_invalidos");

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/admin/login");

  const service = createSupabaseServiceClient();

  await service.from("schedule_exceptions").delete().eq("id", id.data);

  await registrarAuditoria({
    actorUserId: auth.user.id,
    actorRole: "owner",
    action: "agenda.bloqueo_eliminado",
    entity: "schedule_exceptions",
    entityId: id.data,
  });

  revalidatePath("/admin/horarios");
  redirect("/admin/horarios");
}

