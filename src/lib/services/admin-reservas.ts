import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Operaciones administrativas del Hito 2.2.
 * Las funciones críticas (confirmar/extender/presencial/bloqueos) viven en
 * PostgreSQL (security definer) y verifican rol owner con auth.uid();
 * estas utilidades las invocan con la sesión del administrador (SSR).
 */

async function clienteAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    throw new Error("Sesión de administrador requerida");
  }
  return { supabase, userId: auth.user.id };
}

export type ResultadoOperacion = {
  ok: boolean;
  error?: string;
  detalle?: Record<string, unknown>;
};

function errorAmigable(clave: string | undefined): string {
  const mapa: Record<string, string> = {
    no_autorizado: "Tu usuario no está autorizado como owner activo.",
    reserva_no_encontrada: "La reserva no existe.",
    retencion_expirada:
      "La retención ya venció. Verifica disponibilidad y reprograma o crea una nueva reserva.",
    retencion_ya_expirada: "La retención ya venció; no se puede extender.",
    retencion_ya_confirmada: "",
    estado_no_confirmable: "La reserva no está en estado de retención (HELD).",
    estado_no_extendible: "Solo las retenciones HELD se pueden extender.",
    adelante_insuficiente:
      "El adelanto verificado no alcanza el adelanto requerido. Registra y verifica el pago antes de confirmar.",
    horario_libre_reprogramar:
      "El horario ya no está retenido por esta reserva. Reprograma con disponibilidad nueva.",
    slot_no_disponible:
      "Ese horario está ocupado. Elige otro horario disponible.",
    conflicto_con_citas:
      "El bloqueo choca con citas existentes. Resuélvelas primero (ver detalle).",
    rango_invalido: "El rango de fechas es inválido.",
    extension_excede_maximo: "La extensión excede el máximo configurado.",
    minutos_invalidos: "Los minutos de extensión son inválidos.",
    bloqueo_no_encontrado: "El bloqueo no existe.",
    fuera_de_ventana: "La fecha excede el horizonte de agenda.",
    fuera_de_horario: "El horario está fuera del horario de atención.",
    agenda_bloqueada: "Ese día tiene una excepción de calendario.",
    servicio_no_disponible: "El servicio no está disponible.",
    variante_no_disponible: "La duración seleccionada no está disponible.",
    configuracion_ausente: "Falta la configuración del negocio.",
    interno: "Error interno. Intenta de nuevo.",
  };
  return mapa[clave ?? ""] ?? "Operación rechazada por el sistema.";
}

export async function confirmarReservaAdmin(
  bookingId: string,
  motivo = "",
): Promise<ResultadoOperacion> {
  const { supabase } = await clienteAdmin();

  const { data, error } = await supabase.rpc("confirmar_reserva_admin", {
    p_booking_id: bookingId,
    p_motivo: motivo,
  });

  if (error) {
    return { ok: false, error: "El sistema rechazó la confirmación." };
  }

  const respuesta = (data ?? {}) as {
    ok?: boolean;
    error?: string;
    deposit_verified_cents?: number;
  };

  if (!respuesta.ok) {
    return { ok: false, error: errorAmigable(respuesta.error) };
  }

  return { ok: true, detalle: { depositVerifiedCents: respuesta.deposit_verified_cents ?? 0 } };
}

export async function extenderRetencion(
  bookingId: string,
  minutosExtra: number,
  motivo = "",
): Promise<ResultadoOperacion> {
  const { supabase } = await clienteAdmin();

  const { data, error } = await supabase.rpc("extender_retencion", {
    p_booking_id: bookingId,
    p_minutos_extra: minutosExtra,
    p_motivo: motivo,
  });

  if (error) {
    return { ok: false, error: "El sistema rechazó la extensión." };
  }

  const respuesta = (data ?? {}) as {
    ok?: boolean;
    error?: string;
    max_minutos?: number;
    nuevo_vencimiento?: string;
  };

  if (!respuesta.ok) {
    const base = errorAmigable(respuesta.error);
    return {
      ok: false,
      error: respuesta.error === "extension_excede_maximo"
        ? `${base} (máximo ${respuesta.max_minutos} min)`
        : base,
    };
  }

  return { ok: true, detalle: { nuevoVencimiento: respuesta.nuevo_vencimiento } };
}

export type MetodoAdelanto = "YAPE" | "PLIN" | "BANK_TRANSFER" | "CASH" | "OTHER";

export type AdelantoManual = {
  id: string;
  method: MetodoAdelanto;
  amountCents: number;
  verificationStatus: "REPORTED" | "VERIFIED" | "REJECTED";
  transactionReference: string | null;
  paidAt: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
  rejectionReason: string;
  notes: string;
};

export async function registrarAdelantoManual(entrada: {
  bookingId: string;
  method: MetodoAdelanto;
  amountCents: number;
  transactionReference: string;
  paidAt: string | null;
  notes: string;
}): Promise<ResultadoOperacion> {
  const { supabase } = await clienteAdmin();

  const { error } = await supabase.from("manual_payments").insert({
    booking_id: entrada.bookingId,
    method: entrada.method,
    amount_cents: entrada.amountCents,
    transaction_reference: entrada.transactionReference || null,
    paid_at: entrada.paidAt,
    verification_status: "REPORTED",
    notes: entrada.notes,
  });

  if (error) {
    if (String(error.message).includes("manual_payments_referencia_unica")) {
      return {
        ok: false,
        error: "Esa referencia ya fue registrada con el mismo método. Verifica si es un pago repetido.",
      };
    }
    return { ok: false, error: "No se pudo registrar el adelanto." };
  }

  return { ok: true };
}

export async function listarAdelantos(bookingId: string): Promise<AdelantoManual[]> {
  const { supabase } = await clienteAdmin();

  const { data } = await supabase
    .from("manual_payments")
    .select(
      "id, method, amount_cents, verification_status, transaction_reference, paid_at, verified_at, verified_by, rejection_reason, notes",
    )
    .eq("booking_id", bookingId)
    .order("created_at");

  return (data ?? []).map((fila) => ({
    id: String(fila.id),
    method: fila.method,
    amountCents: Number(fila.amount_cents),
    verificationStatus: fila.verification_status,
    transactionReference: fila.transaction_reference,
    paidAt: fila.paid_at,
    verifiedAt: fila.verified_at,
    verifiedBy: fila.verified_by,
    rejectionReason: String(fila.rejection_reason ?? ""),
    notes: String(fila.notes ?? ""),
  }));
}

export async function verificarAdelanto(paymentId: string): Promise<ResultadoOperacion> {
  const { supabase, userId } = await clienteAdmin();

  const { error } = await supabase
    .from("manual_payments")
    .update({
      verification_status: "VERIFIED",
      verified_at: new Date().toISOString(),
      verified_by: userId,
      rejection_reason: "",
    })
    .eq("id", paymentId)
    .eq("verification_status", "REPORTED");

  if (error) {
    return { ok: false, error: "No se pudo verificar el adelanto." };
  }

  return { ok: true };
}

export async function rechazarAdelanto(
  paymentId: string,
  motivo: string,
): Promise<ResultadoOperacion> {
  const { supabase, userId } = await clienteAdmin();

  const { error } = await supabase
    .from("manual_payments")
    .update({
      verification_status: "REJECTED",
      verified_at: null,
      verified_by: userId,
      rejection_reason: motivo || "sin motivo registrado",
    })
    .eq("id", paymentId)
    .eq("verification_status", "REPORTED");

  if (error) {
    return { ok: false, error: "No se pudo rechazar el adelanto." };
  }

  return { ok: true };
}

export async function completarCita(bookingId: string): Promise<ResultadoOperacion> {
  return await cambiarEstadoAdmin(bookingId, "COMPLETED");
}

export async function registrarNoShow(bookingId: string): Promise<ResultadoOperacion> {
  return await cambiarEstadoAdmin(bookingId, "NO_SHOW");
}

export async function cancelarComoAdmin(
  bookingId: string,
  motivo: string,
): Promise<ResultadoOperacion> {
  const resultado = await cambiarEstadoAdmin(bookingId, "CANCELLED");
  void motivo;
  return resultado;
}

async function cambiarEstadoAdmin(
  bookingId: string,
  nuevoEstado: "COMPLETED" | "NO_SHOW" | "CANCELLED",
): Promise<ResultadoOperacion> {
  const { supabase, userId } = await clienteAdmin();

  const { error } = await supabase
    .from("bookings")
    .update({ status: nuevoEstado })
    .eq("id", bookingId);

  if (error) {
    return {
      ok: false,
      error: String(error.message).includes("Transición")
        ? "La transición de estado no está permitida."
        : "No se pudo cambiar el estado.",
    };
  }

  await registrarAuditoriaLocal(supabase, userId, `reserva.${nuevoEstado.toLowerCase()}`, bookingId, nuevoEstado);

  return { ok: true };
}

async function registrarAuditoriaLocal(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  action: string,
  entityId: string,
  after: unknown,
): Promise<void> {
  await supabase.from("audit_logs").insert({
    actor_user_id: userId,
    actor_role: "owner",
    action,
    entity: "bookings",
    entity_id: entityId,
    after: after ?? null,
  });
}

export type EntradaPresencial = {
  serviceSlug: string;
  variantId: string;
  startsAt: string;
  nombre: string;
  telefono: string;
  email: string;
  consent: boolean;
  notas: string;
  exencionAdelanto: boolean;
  motivoExencion: string;
  origen?: "IN_PERSON" | "WHATSAPP" | "PHONE";
};

export async function crearReservaPresencial(
  entrada: EntradaPresencial,
): Promise<ResultadoOperacion> {
  const { supabase } = await clienteAdmin();

  const { data, error } = await supabase.rpc("crear_reserva_presencial", {
    p_entrada: {
      service_slug: entrada.serviceSlug,
      variant_id: entrada.variantId,
      starts_at: entrada.startsAt,
      full_name: entrada.nombre,
      phone: entrada.telefono,
      email: entrada.email,
      consent: entrada.consent,
      notes: entrada.notas,
      exencion_adelanto: entrada.exencionAdelanto,
      motivo_exencion: entrada.motivoExencion,
    },
  });

  if (error) {
    return { ok: false, error: "El sistema rechazó la reserva presencial." };
  }

  const respuesta = (data ?? {}) as {
    ok?: boolean;
    error?: string;
    conflictos?: unknown;
    id?: string;
    public_code?: string;
  };

  if (!respuesta.ok) {
    if (respuesta.error === "conflicto_con_citas") {
      return {
        ok: false,
        error: "El bloqueo choca con citas existentes.",
        detalle: { conflictos: respuesta.conflictos },
      };
    }
    return { ok: false, error: errorAmigable(respuesta.error) };
  }

  if (respuesta.ok && respuesta.id && entrada.origen && entrada.origen !== "IN_PERSON") {
    await supabase.from("bookings").update({ origin: entrada.origen }).eq("id", respuesta.id);
  }

  return {
    ok: true,
    detalle: { id: respuesta.id, codigoPublico: respuesta.public_code },
  };
}

export async function crearBloqueo(entrada: {
  inicio: string;
  fin: string;
  tipo: "BREAK" | "INTERNAL" | "ABSENCE" | "MAINTENANCE" | "OTHER";
  reason: string;
}): Promise<ResultadoOperacion> {
  const { supabase } = await clienteAdmin();

  const { data, error } = await supabase.rpc("crear_bloqueo_agenda", {
    p_inicio: entrada.inicio,
    p_fin: entrada.fin,
    p_tipo: entrada.tipo,
    p_reason: entrada.reason,
  });

  if (error) {
    return { ok: false, error: "El sistema rechazó el bloqueo." };
  }

  const respuesta = (data ?? {}) as {
    ok?: boolean;
    error?: string;
    conflictos?: unknown;
  };

  if (!respuesta.ok) {
    if (respuesta.error === "conflicto_con_citas") {
      return {
        ok: false,
        error: "El bloqueo choca con citas existentes. Resuélvelas primero.",
        detalle: { conflictos: respuesta.conflictos },
      };
    }
    return { ok: false, error: errorAmigable(respuesta.error) };
  }

  return { ok: true };
}

export async function retirarBloqueo(blockId: string): Promise<ResultadoOperacion> {
  const { supabase } = await clienteAdmin();

  const { data, error } = await supabase.rpc("liberar_bloqueo_agenda", {
    p_block_id: blockId,
  });

  if (error) {
    return { ok: false, error: "El sistema rechazó la operación." };
  }

  const respuesta = (data ?? {}) as { ok?: boolean; error?: string };

  if (!respuesta.ok) {
    return { ok: false, error: errorAmigable(respuesta.error) };
  }

  return { ok: true };
}

/**
 * Reprogramación administrativa: migra la MISMA reserva a un nuevo inicio,
 * recalculando el fin con la variante y revalidando conflictos. El trigger
 * re-sincroniza la ocupación y el EXCLUDE final garantiza integridad.
 */
export async function reprogramarReserva(
  bookingId: string,
  nuevoInicio: string,
): Promise<ResultadoOperacion> {
  const { supabase, userId } = await clienteAdmin();

  const { data: reserva } = await supabase
    .from("bookings")
    .select("id, status, starts_at, ends_at, service_variant_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (!reserva) {
    return { ok: false, error: "Reserva no encontrada." };
  }

  if (!["HELD", "CONFIRMED"].includes(reserva.status)) {
    return { ok: false, error: "Solo se reprograman reservas HELD o CONFIRMED." };
  }

  const { data: variante } = await supabase
    .from("service_variants")
    .select("duration_minutes, prep_buffer_minutes")
    .eq("id", reserva.service_variant_id)
    .maybeSingle();

  if (!variante) {
    return { ok: false, error: "Variante no encontrada." };
  }

  const { data: settings } = await supabase
    .from("business_settings")
    .select("booking_gap_minutes")
    .limit(1)
    .maybeSingle();

  const gap = settings?.booking_gap_minutes ?? 15;
  const nuevoFin = new Date(
    new Date(nuevoInicio).getTime() +
      (variante.duration_minutes + variante.prep_buffer_minutes) * 60_000,
  ).toISOString();

  const margen = gap * 60_000;
  void margen;

  const { data: solapa } = await supabase.rpc("hay_conflicto_agenda", {
    p_inicio: nuevoInicio,
    p_fin: nuevoFin,
    p_excluir_booking: bookingId,
    p_margen_min: gap,
  });

  if (solapa === true) {
    return { ok: false, error: "El nuevo horario está ocupado. Elige otro." };
  }

  const { error } = await supabase
    .from("bookings")
    .update({ starts_at: nuevoInicio, ends_at: nuevoFin })
    .eq("id", bookingId);

  if (error) {
    return { ok: false, error: "El sistema rechazó la reprogramación." };
  }

  await registrarAuditoriaLocal(supabase, userId, "reserva.reprogramada", bookingId, {
    de: reserva.starts_at,
    a: nuevoInicio,
  });

  return { ok: true };
}
