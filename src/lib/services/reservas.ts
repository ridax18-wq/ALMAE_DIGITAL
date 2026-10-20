import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type ResultadoReserva = {
  ok: boolean;
  error?: string;
  yaCreada?: boolean;
  token?: string;
  codigoPublico?: string;
  expira?: string;
  termina?: string;
  etiqueta?: string;
};

type EntradaReserva = {
  servicio: string;
  variante: string;
  inicio: string;
  nombre: string;
  telefono: string;
  email: string;
  notas: string;
  consentimiento: boolean;
  utm?: { source?: string; medium?: string; campaign?: string; sourceId?: string };
};

const ERRORES_AMIGABLES: Record<string, string> = {
  servicio_no_disponible:
    "El servicio no está disponible. Actualiza la página e intenta de nuevo.",
  variante_no_disponible:
    "La duración seleccionada ya no está disponible. Elige otra opción.",
  fuera_de_ventana:
    "Ese horario ya no se puede reservar (antelación o fecha inválida). Selecciona otro.",
  fuera_de_horario:
    "Ese horario quedó fuera del horario de atención. Elige otro horario.",
  agenda_bloqueada: "Ese día está bloqueado. Elige otra fecha.",
  slot_no_disponible:
    "Ese horario acaba de ser tomado. Elige otro horario disponible.",
  configuracion_ausente: "Configuración pendiente del negocio. Intenta más tarde.",
  interno: "Error interno del sistema. Intenta de nuevo.",
};

export async function crearReserva(
  entrada: EntradaReserva,
): Promise<ResultadoReserva> {
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase.rpc("crear_retencion_web", {
    p_service_slug: entrada.servicio,
    p_variant_id: entrada.variante,
    p_starts_at: entrada.inicio,
    p_patient: {
      full_name: entrada.nombre,
      phone: entrada.telefono,
      email: entrada.email,
      notes: entrada.notas,
      consent: entrada.consentimiento,
    },
    p_utm: {
      utm_source: entrada.utm?.source ?? null,
      utm_medium: entrada.utm?.medium ?? null,
      utm_campaign: entrada.utm?.campaign ?? null,
      source_id: entrada.utm?.sourceId ?? null,
    },
  });

  if (error) {
    return { ok: false, error: "No pudimos crear la reserva. Intenta de nuevo." };
  }

  const respuesta = (data ?? {}) as {
    ok?: boolean;
    error?: string;
    ya_creada?: boolean;
    token?: string;
    public_code?: string;
    expires_at?: string;
    ends_at?: string;
    etiqueta?: string;
  };

  if (!respuesta.ok) {
    return {
      ok: false,
      error:
        ERRORES_AMIGABLES[respuesta.error ?? ""] ?? ERRORES_AMIGABLES.slot_no_disponible,
    };
  }

  return {
    ok: true,
    yaCreada: respuesta.ya_creada ?? false,
    token: respuesta.token,
    codigoPublico: respuesta.public_code,
    expira: respuesta.expires_at,
    termina: respuesta.ends_at,
    etiqueta: respuesta.etiqueta,
  };
}

export type ReservaVista = {
  id: string;
  status: string;
  origin: string;
  service: string;
  slug: string;
  duracionMin: number;
  inicioLima: string;
  finLima: string;
  amountCents: number;
  depositRequiredCents: number;
  depositVerifiedCents: number;
  currency: string;
  codigoPublico: string;
  notes: string;
  holdExpira: string | null;
  tokenExpira: string;
  pacienteNombre: string;
  pacienteTelefono: string;
  policyHours: number;
  puedeCancelar: boolean;
};

export async function obtenerReserva(token: string): Promise<ReservaVista | null> {
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase.rpc("obtener_reserva_por_token", {
    p_token: token,
  });

  if (error || !data) return null;

  const reserva = data as Record<string, unknown>;
  if (!reserva.id) return null;

  return {
    id: String(reserva.id),
    status: String(reserva.status),
    origin: String(reserva.origin),
    service: String(reserva.service),
    slug: String(reserva.slug),
    duracionMin: Number(reserva.duracion_min),
    inicioLima: String(reserva.inicio_lima),
    finLima: String(reserva.fin_lima),
    amountCents: Number(reserva.amount_cents),
    depositRequiredCents: Number(reserva.deposit_required_cents),
    depositVerifiedCents: Number(reserva.deposit_verified_cents),
    currency: String(reserva.currency),
    codigoPublico: String(reserva.public_code),
    notes: String(reserva.notes ?? ""),
    holdExpira: reserva.hold_expira ? String(reserva.hold_expira) : null,
    tokenExpira: String(reserva.token_expira),
    pacienteNombre: String(reserva.paciente_nombre),
    pacienteTelefono: String(reserva.paciente_telefono),
    policyHours: Number(reserva.policy_hours ?? 24),
    puedeCancelar: Boolean(reserva.puede_cancelar),
  };
}

export type ResultadoCancelacion = {
  ok: boolean;
  error?: string;
  status?: string;
};

export async function cancelarReserva(token: string): Promise<ResultadoCancelacion> {
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase.rpc("cancelar_reserva_por_token", {
    p_token: token,
    p_motivo: "",
  });

  if (error) {
    return { ok: false, error: "No se pudo cancelar. Intenta de nuevo." };
  }

  const respuesta = (data ?? {}) as { ok?: boolean; error?: string; status?: string };

  if (!respuesta.ok) {
    return {
      ok: false,
      error:
        respuesta.error === "fuera_de_politica"
          ? "La cancelación está fuera del plazo de la política de reservas."
          : "No se pudo cancelar la reserva.",
    };
  }

  return { ok: true, status: respuesta.status };
}

export async function expirarRetenciones(): Promise<number> {
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase.rpc("expirar_retenciones");
  if (error) return 0;
  return Number(data ?? 0);
}
