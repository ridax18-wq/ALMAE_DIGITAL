"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  crearBloqueo,
  retirarBloqueo,
  crearReservaPresencial,
} from "@/lib/services/admin-reservas";
import { disponibilidadDeDia } from "@/lib/services/disponibilidad";
import { horaLimaDeIso } from "@/lib/services/agenda-vista";

export type ResultadoHorariosAdmin =
  | { ok: true; horas: string[] }
  | { ok: false; error: string };

export async function consultarHorariosAdmin(datos: FormData): Promise<ResultadoHorariosAdmin> {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Sesión requerida" };

  const parsed = z
    .object({
      variant_id: z.uuid(),
      fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
    })
    .safeParse({
      variant_id: datos.get("variant_id"),
      fecha: datos.get("fecha"),
    });
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  const service = createSupabaseServiceClient();
  const { data: variante } = await service
    .from("service_variants")
    .select("service_id")
    .eq("id", parsed.data.variant_id)
    .maybeSingle();
  if (!variante) return { ok: false, error: "Servicio no disponible" };

  const { data: servicio } = await service
    .from("services")
    .select("slug")
    .eq("id", variante.service_id)
    .maybeSingle();
  if (!servicio) return { ok: false, error: "Servicio no disponible" };

  const resultado = await disponibilidadDeDia(servicio.slug, parsed.data.variant_id, parsed.data.fecha);
  if (!resultado.ok || !resultado.slots) {
    return { ok: false, error: resultado.error ?? "No se pudo consultar la disponibilidad" };
  }

  return {
    ok: true,
    horas: resultado.slots.map((s) => horaLimaDeIso(s.inicioUtc)),
  };
}

export async function bloquearHorario(datos: FormData): Promise<void> {
  const fechaCruda = datos.get("fecha");
  const fechaQuery =
    typeof fechaCruda === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fechaCruda)
      ? `&fecha=${fechaCruda}`
      : "";
  const parsed = z
    .object({
      fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
      hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, "Hora de inicio inválida"),
      hora_fin: z.string().regex(/^\d{2}:\d{2}$/, "Hora de fin inválida"),
      tipo: z.enum(["BREAK", "INTERNAL", "ABSENCE", "MAINTENANCE", "OTHER"]),
      motivo: z.string().max(120).optional(),
    })
    .safeParse({
      fecha: fechaCruda,
      hora_inicio: datos.get("hora_inicio"),
      hora_fin: datos.get("hora_fin"),
      tipo: datos.get("tipo"),
      motivo: datos.get("motivo"),
    });

  if (!parsed.success) {
    redirect(`/admin/agenda?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "datos inválidos")}${fechaQuery}`);
  }

  const resultado = await crearBloqueo({
    inicio: `${parsed.data.fecha}T${parsed.data.hora_inicio}:00-05:00`,
    fin: `${parsed.data.fecha}T${parsed.data.hora_fin}:00-05:00`,
    tipo: parsed.data.tipo,
    reason: parsed.data.motivo ?? "",
  });

  if (!resultado.ok) {
    redirect(`/admin/agenda?fecha=${parsed.data.fecha}&error=${encodeURIComponent(resultado.error ?? "error")}`);
  }

  revalidatePath("/admin/agenda");
  revalidatePath("/reservar");
  redirect(`/admin/agenda?fecha=${parsed.data.fecha}`);
}

export async function retirarBloqueoAdmin(datos: FormData): Promise<void> {
  const blockId = z.uuid().safeParse(datos.get("block_id"));

  if (!blockId.success) {
    redirect("/admin/agenda?error=datos_invalidos");
  }

  const resultado = await retirarBloqueo(blockId.data);

  if (!resultado.ok) {
    redirect(`/admin/agenda?error=${encodeURIComponent(resultado.error ?? "error")}`);
  }

  revalidatePath("/admin/agenda");
  revalidatePath("/reservar");
  redirect("/admin/agenda");
}

export async function registrarPresencial(datos: FormData): Promise<void> {
  const fechaCruda = datos.get("fecha");
  const fechaQuery =
    typeof fechaCruda === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fechaCruda)
      ? `&fecha=${fechaCruda}`
      : "";
  const parsed = z
    .object({
      variant_id: z.uuid(),
      fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
      hora: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
      nombre: z.string().trim().min(2).max(80),
      telefono: z.string().trim().regex(/^9\d{8}$/, "Celular inválido (9 dígitos, empieza con 9)"),
      email: z.union([z.literal(""), z.email("Correo inválido")]).optional(),
      notas: z.string().max(300).optional(),
      exencion: z.string().optional(),
      motivo_exencion: z.string().max(120).optional(),
      origen: z.enum(["IN_PERSON", "WHATSAPP", "PHONE"]).default("IN_PERSON"),
    })
    .safeParse({
      variant_id: datos.get("variant_id"),
      fecha: fechaCruda,
      hora: datos.get("hora"),
      nombre: datos.get("nombre"),
      telefono: datos.get("telefono"),
      email: datos.get("email") ?? "",
      notas: datos.get("notas") ?? "",
      exencion: datos.get("exencion") ?? undefined,
      motivo_exencion: datos.get("motivo_exencion") ?? "",
      origen: datos.get("origen") ?? "IN_PERSON",
    });

  if (!parsed.success) {
    redirect(`/admin/agenda?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "datos inválidos")}${fechaQuery}`);
  }

  const service = createSupabaseServiceClient();

  const { data: variante } = await service
    .from("service_variants")
    .select("id, service_id")
    .eq("id", parsed.data.variant_id)
    .maybeSingle();

  if (!variante) {
    redirect(`/admin/agenda?fecha=${parsed.data.fecha}&error=La%20duraci%C3%B3n%20seleccionada%20no%20existe`);
  }

  const { data: servicio } = await service
    .from("services")
    .select("id, slug, active, location")
    .eq("id", variante.service_id)
    .maybeSingle();

  if (!servicio || !servicio.active || servicio.location !== "consultorio") {
    redirect(`/admin/agenda?fecha=${parsed.data.fecha}&error=El%20servicio%20no%20est%C3%A1%20disponible`);
  }

  const resultado = await crearReservaPresencial({
    serviceSlug: servicio.slug,
    variantId: parsed.data.variant_id,
    startsAt: `${parsed.data.fecha}T${parsed.data.hora}:00-05:00`,
    nombre: parsed.data.nombre,
    telefono: parsed.data.telefono,
    email: parsed.data.email ?? "",
    consent: true,
    notas: parsed.data.notas ?? "",
    exencionAdelanto: parsed.data.exencion === "on",
    motivoExencion: parsed.data.motivo_exencion ?? "",
    origen: parsed.data.origen,
  });

  if (!resultado.ok) {
    redirect(`/admin/agenda?fecha=${parsed.data.fecha}&error=${encodeURIComponent(resultado.error ?? "error")}`);
  }

  revalidatePath("/admin/agenda");
  revalidatePath("/reservar");
  redirect(`/admin/agenda?fecha=${parsed.data.fecha}&presencial=ok&codigo=${encodeURIComponent(String(resultado.detalle?.codigoPublico ?? ""))}`);
}

export async function crearExcepcionCalendario(datos: FormData): Promise<void> {
  const parsed = z
    .object({
      fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
      fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
      tipo: z.enum(["full_day", "holiday", "partial"]),
      hora_desde: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      hora_hasta: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      motivo: z.string().max(120).optional(),
    })
    .safeParse({
      fecha_inicio: datos.get("fecha_inicio"),
      fecha_fin: datos.get("fecha_fin"),
      tipo: datos.get("tipo"),
      hora_desde: datos.get("hora_desde"),
      hora_hasta: datos.get("hora_hasta"),
      motivo: datos.get("motivo"),
    });

  if (!parsed.success) {
    redirect(`/admin/horarios?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "datos inválidos")}`);
  }

  const service = createSupabaseServiceClient();
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) redirect("/admin/login");

  const { error } = await service.from("schedule_exceptions").insert({
    kind: parsed.data.tipo,
    date_from: parsed.data.fecha_inicio,
    date_to: parsed.data.fecha_fin,
    time_from: parsed.data.tipo === "partial" ? `${parsed.data.hora_desde ?? "00:00"}:00` : null,
    time_to: parsed.data.tipo === "partial" ? `${parsed.data.hora_hasta ?? "23:59"}:00` : null,
    reason: parsed.data.motivo ?? "",
    created_by: auth.user.id,
  });

  if (error) {
    redirect(`/admin/horarios?error=${encodeURIComponent(error.message)}`);
  }

  await service.from("audit_logs").insert({
    actor_user_id: auth.user.id,
    actor_role: "owner",
    action: "agenda.excepcion_creada",
    entity: "schedule_exceptions",
    after: parsed.data,
  });

  revalidatePath("/admin/horarios");
  revalidatePath("/reservar");
  redirect("/admin/horarios");
}

export async function eliminarExcepcionCalendario(datos: FormData): Promise<void> {
  const excepcionId = z.uuid().safeParse(datos.get("excepcion_id"));

  if (!excepcionId.success) {
    redirect("/admin/horarios?error=datos_invalidos");
  }

  const service = createSupabaseServiceClient();
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) redirect("/admin/login");

  await service.from("schedule_exceptions").delete().eq("id", excepcionId.data);

  await service.from("audit_logs").insert({
    actor_user_id: auth.user.id,
    actor_role: "owner",
    action: "agenda.excepcion_eliminada",
    entity: "schedule_exceptions",
    entity_id: excepcionId.data,
  });

  revalidatePath("/admin/horarios");
  revalidatePath("/reservar");
  redirect("/admin/horarios");
}
