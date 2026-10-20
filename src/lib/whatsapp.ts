import { getWhatsAppNumber } from "@/lib/site";

export type WhatsAppIntent =
  | "general"
  | "servicio"
  | "cita"
  | "paquetes"
  | "pago"
  | "orientacion"
  | "adelanto";

const MESSAGES: Record<WhatsAppIntent, string> = {
  general: "Hola ALMAE, quisiera información sobre sus servicios.",
  servicio: "Hola ALMAE, quisiera consultar por el servicio de",
  cita: "Hola ALMAE, quisiera consultar por una cita que reservé.",
  paquetes: "Hola ALMAE, quisiera información sobre paquetes de sesiones.",
  pago: "Hola ALMAE, necesito ayuda con el pago de mi reserva.",
  orientacion: "Hola ALMAE, quisiera orientación sobre qué tratamiento me conviene.",
  adelanto: "Hola ALMAE, ya separé mi horario. Quisiera coordinar el adelanto:",
};

export function buildWhatsAppUrl(
  intent: WhatsAppIntent,
  detail?: string,
): string | null {
  const number = getWhatsAppNumber();
  if (!number) return null;
  const base = MESSAGES[intent];
  const text = detail ? `${base} ${detail}.` : base;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
