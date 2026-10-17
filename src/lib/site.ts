export const site = {
  name: "ALMAE",
  subtitle: "Terapia y Spa",
  legalName: "ALMAE Terapia y Spa",
  tagline: "Fisioterapia, rehabilitación y bienestar en Lima",
  description:
    "ALMAE Terapia y Spa: terapia física y rehabilitación, masajes, acupuntura y reflexología en Lima. Reserva tu cita en línea y confirma con un adelanto seguro.",
  city: "Lima, Perú",
  timezone: "America/Lima" as const,
  professional: {
    name: "Tec. Fisioterapeuta Leonor Morán René",
    shortName: "Leonor Morán René",
    title: "Tec. Fisioterapeuta",
  },
  address: "Altos del Rímac 250, Rímac — Lima, Perú",
  equipment: [
    "Ultrasonido",
    "Corriente TENS",
    "Láser",
    "Punción seca",
    "Ventosas",
  ],
};

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return raw && raw.length > 0 ? raw.replace(/\/$/, "") : "http://localhost:3000";
}

export function getWhatsAppNumber(): string {
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim();
  if (raw) {
    const digits = raw.replace(/[^\d]/g, "");
    if (digits.length > 0) return digits;
  }
  return "51919608174";
}
