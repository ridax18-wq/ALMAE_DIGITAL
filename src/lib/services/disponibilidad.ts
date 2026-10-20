import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  calcularSlots,
  fechaHoraLimaADate,
  type DatosVariante,
  type FranjaDia,
  type Ocupacion,
  type ParametrosDisponibilidad,
  type Slot,
} from "@/lib/services/availability";
import { expirarRetenciones } from "@/lib/services/reservas";

export type DisponibilidadDia = {
  ok: boolean;
  error?: string;
  fecha?: string;
  slots?: Slot[];
};

export async function disponibilidadDeDia(
  slug: string,
  variantId: string,
  fecha: string,
): Promise<DisponibilidadDia> {
  await expirarRetenciones();

  const supabase = createSupabaseServiceClient();

  const { data: variant } = await supabase
    .from("service_variants")
    .select("id, service_id, duration_minutes, prep_buffer_minutes")
    .eq("id", variantId)
    .maybeSingle();

  if (!variant) {
    return { ok: false, error: "servicio_no_disponible" };
  }

  const { data: service } = await supabase
    .from("services")
    .select("id, slug, location, active")
    .eq("id", variant.service_id)
    .maybeSingle();

  if (!service || service.slug !== slug || !service.active) {
    return { ok: false, error: "servicio_no_disponible" };
  }

  if (service.location !== "consultorio") {
    return { ok: false, error: "servicio_no_disponible" };
  }

  const { data: settings } = await supabase
    .from("business_settings")
    .select(
      "booking_hold_ttl_minutes, booking_gap_minutes, min_booking_lead_hours, max_advance_days",
    )
    .limit(1)
    .maybeSingle();

  if (!settings) {
    return { ok: false, error: "configuracion_ausente" };
  }

  const weekday = new Date(`${fecha}T12:00:00-05:00`).getUTCDay();
  const dayISO = weekday === 0 ? 7 : weekday;

  const { data: bloquesDia } = await supabase
    .from("business_hours")
    .select("opens_at, closes_at, break_start, break_end")
    .eq("day_of_week", dayISO);

  const franjas: FranjaDia[] = (bloquesDia ?? [])
    .filter((b) => Boolean(b.opens_at) && Boolean(b.closes_at))
    .map((b) => ({
      apertura: b.opens_at,
      cierre: b.closes_at,
      descansos:
        b.break_start && b.break_end
          ? [{ desdeHora: b.break_start, hastaHora: b.break_end }]
          : [],
    }));

  if (franjas.length === 0) {
    return { ok: true, fecha, slots: [] };
  }

  const { data: excepciones } = await supabase
    .from("schedule_exceptions")
    .select("kind, time_from, time_to")
    .lte("date_from", fecha)
    .gte("date_to", fecha);

  let cerradoPorExcepcion = false;
  const descansosExtra: { desdeHora: string; hastaHora: string }[] = [];

  for (const excepcion of excepciones ?? []) {
    if (excepcion.kind === "full_day" || excepcion.kind === "holiday") {
      cerradoPorExcepcion = true;
      break;
    }
    if (excepcion.kind === "partial" && excepcion.time_from && excepcion.time_to) {
      descansosExtra.push({
        desdeHora: excepcion.time_from,
        hastaHora: excepcion.time_to,
      });
    }
  }

  if (cerradoPorExcepcion) {
    return { ok: true, fecha, slots: [] };
  }

  for (const franja of franjas) {
    franja.descansos.push(...descansosExtra);
  }

  const diaInicioUtc = fechaHoraLimaADate(fecha, "00:00").toISOString();
  const diaFinUtc = new Date(
    fechaHoraLimaADate(fecha, "00:00").getTime() + 24 * 60 * 60_000,
  ).toISOString();

  const [{ data: citas }, { data: bloqueos }] = await Promise.all([
    supabase
      .from("bookings")
      .select("starts_at, ends_at")
      .in("status", ["HELD", "PENDING_PAYMENT", "CONFIRMED"])
      .lt("starts_at", diaFinUtc)
      .gt("ends_at", diaInicioUtc),
    supabase
      .from("schedule_blocks")
      .select("starts_at, ends_at")
      .lt("starts_at", diaFinUtc)
      .gt("ends_at", diaInicioUtc),
  ]);

  const ocupaciones: Ocupacion[] = [
    ...(citas ?? []).map((o) => ({ desde: new Date(o.starts_at), hasta: new Date(o.ends_at) })),
    ...(bloqueos ?? []).map((o) => ({ desde: new Date(o.starts_at), hasta: new Date(o.ends_at) })),
  ];

  const parametros: ParametrosDisponibilidad = {
    fecha,
    weekday,
    franjas,
    pasoMinutos: 15,
    gapMinutos: settings.booking_gap_minutes,
    leadMinutos: settings.min_booking_lead_hours * 60,
    variante: {
      id: variant.id,
      duracionMinutos: variant.duration_minutes,
      prepBufferMinutos: variant.prep_buffer_minutes,
    } satisfies DatosVariante,
    ocupaciones,
  };

  const slots = calcularSlots(parametros);

  return { ok: true, fecha, slots };
}
