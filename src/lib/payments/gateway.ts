export type ProveedorPagos = "mock" | "culqi" | "manual";

export type EventoWebhook =
  | "charge.succeeded"
  | "charge.failed"
  | "charge.expired";

export type EstadoPagoApp =
  | "CREATED"
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "EXPIRED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "RECONCILIATION";

export type IntencionPago = {
  referencia: string;
  proveedor: ProveedorPagos;
  monto: number;
  moneda: string;
  expira: string | null;
  urlCheckout: string | null;
};

export interface PasarelaPagos {
  proveedor(): ProveedorPagos;
  /** Crea (o reutiliza) la intención de cobro para una reserva vigente. */
  iniciar(entrada: {
    bookingId: string;
    referencia: string;
    monto: number;
    moneda: string;
    expira: Date | null;
  }): Promise<{ urlCheckout: string | null }>;
}

export function proveedorActivo(): ProveedorPagos {
  const valor = process.env.PAYMENTS_PROVIDER?.trim().toLowerCase();
  if (valor === "culqi" || valor === "manual") return valor;
  return "mock";
}

/**
 * Producción = todo entorno que no se declare explícitamente "development"
 * (fallo cerrado: si la variable falta, el simulador queda bloqueado).
 * El simulador de pagos está prohibido en producción, sin excepciones.
 */
export function esProduccion(): boolean {
  return process.env.NEXT_PUBLIC_ENV !== "development";
}

export function simuladorDisponible(): boolean {
  return proveedorActivo() === "mock" && !esProduccion();
}
