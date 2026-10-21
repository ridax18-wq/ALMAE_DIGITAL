export const ETIQUETAS_ESTADO: Record<string, { texto: string; clases: string }> = {
  HELD: {
    texto: "Horario reservado — pago pendiente",
    clases: "border-amber-200 bg-amber-50 text-amber-900",
  },
  PENDING_PAYMENT: {
    texto: "Pago en proceso",
    clases: "border-amber-200 bg-amber-50 text-amber-900",
  },
  CONFIRMED: {
    texto: "Cita confirmada",
    clases: "border-green-200 bg-green-50 text-green-900",
  },
  COMPLETED: {
    texto: "Atención completada",
    clases: "border-brand-200 bg-brand-50 text-brand-900",
  },
  CANCELLED: {
    texto: "Reserva cancelada",
    clases: "border-sand-200 bg-sand-100 text-ink-700",
  },
  EXPIRED: {
    texto: "Reserva expirada",
    clases: "border-sand-200 bg-sand-100 text-ink-700",
  },
  NO_SHOW: {
    texto: "Inasistencia registrada",
    clases: "border-red-200 bg-red-50 text-red-900",
  },
  REFUND_PENDING: {
    texto: "Reembolso en proceso",
    clases: "border-amber-200 bg-amber-50 text-amber-900",
  },
  REFUNDED: {
    texto: "Reembolso acreditado",
    clases: "border-sand-200 bg-sand-100 text-ink-700",
  },
};

/** Transiciones permitidas al administrador, por estado actual (espejo de bookings_valid_transitions). */
export const TRANSICIONES_ADMIN: Record<string, { a: string; texto: string; tono: "primary" | "secondary" | "danger" }[]> = {
  HELD: [
    { a: "CONFIRMED", texto: "Confirmar (adelanto verificado)", tono: "primary" },
    { a: "CANCELLED", texto: "Cancelar", tono: "danger" },
    { a: "EXPIRED", texto: "Expirar", tono: "secondary" },
  ],
  CONFIRMED: [
    { a: "COMPLETED", texto: "Marcar completada", tono: "primary" },
    { a: "NO_SHOW", texto: "Registrar inasistencia", tono: "danger" },
    { a: "CANCELLED", texto: "Cancelar", tono: "danger" },
  ],
};

export const ESTADOS_FILTRO = [
  "HELD",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "NO_SHOW",
] as const;
