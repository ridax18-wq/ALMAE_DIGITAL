import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  calcularSlots,
  fechaHoraLimaADate,
  type DatosVariante,
  type Descanso,
  type FranjaLaboral,
  type Ocupacion,
  type ParametrosDisponibilidad,
  type Slot,
} from "@/lib/services/availability";

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

  const { data: horas } = await supabase
    .from("business_hours")
    .select("opens_at, closes_at, break_start, break_end")
    .eq("weekday", weekday)
    .maybeSingle();

  let franja: FranjaLaboral | null = null;
  let descansos: Descanso[] = [];

  if (horas) {
    franja = { apertura: horas.opens_at, cierre: horas.closes_at };
    if (horas.break_start && horas.break_end) {
      descansos = [
        { desdeHora: horas.break_start, hastaHora: horas.break_end },
      ];
    }
  }

  const { data: excepciones } = await supabase
    .from("schedule_exceptions")
    .select("kind, time_from, time_to")
    .lte("date_from", fecha)
    .gte("date_to", fecha);

  for (const excepcion of excepciones ?? []) {
    if (excepcion.kind === "full_day" || excepcion.kind === "holiday") {
      franja = null;
      break;
    }
    if (excepcion.time_from && excepcion.time_to) {
      descansos.push({
        desdeHora: excepcion.time_from,
        hastaHora: excepcion.time_to,
      });
    }
  }

  const diaInicioUtc = fechaHoraLimaADate(fecha, "00:00").toISOString();
  const diaFinUtc = new Date(
    fechaHoraLimaADate(fecha, "00:00").getTime() + 24 * 60 * 60_000,
  ).toISOString();

  const { data: ocupadas } = await supabase
    .from("bookings")
    .select("starts_at, ends_at")
    .in("status", ["HELD", "PENDING_PAYMENT", "CONFIRMED"])
    .lt("starts_at", diaFinUtc)
    .gt("ends_at", diaInicioUtc);

  const ocupaciones: Ocupacion[] = (ocupadas ?? []).map((o) => ({
    desde: new Date(o.starts_at),
    hasta: new Date(o.ends_at),
  }));

  const parametros: ParametrosDisponibilidad = {
    fecha,
    weekday,
    franja,
    descansos,
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
