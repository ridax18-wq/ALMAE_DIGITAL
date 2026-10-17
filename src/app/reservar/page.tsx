import type { Metadata } from "next";
import { PendingPage } from "@/components/ui/PendingPage";

export const metadata: Metadata = {
  title: "Reservar cita",
  description:
    "Muy pronto: reserva tu cita de fisioterapia en línea, elige tu horario y confirma con un adelanto seguro.",
  robots: { index: false, follow: true },
};

export default function ReservarPage() {
  return (
    <PendingPage
      title="Reservas en línea, muy pronto"
      phase="Fase 3"
      message="Estamos preparando el sistema para que puedas elegir tu servicio, ver los horarios disponibles reales y confirmar tu cita con un adelanto seguro. Mientras tanto, puedes escribirnos por WhatsApp."
      backLabel="Ver servicios"
      backHref="/servicios"
    />
  );
}
