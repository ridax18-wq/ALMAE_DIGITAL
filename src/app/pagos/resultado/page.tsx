import type { Metadata } from "next";
import { PendingPage } from "@/components/ui/PendingPage";

export const metadata: Metadata = {
  title: "Resultado del pago",
  robots: { index: false, follow: false },
};

export default function PagosResultadoPage() {
  return (
    <PendingPage
      title="Confirmación de pagos, muy pronto"
      phase="Fase 4"
      message="Al reservar tu cita, esta pantalla mostrará el resultado real de tu pago (aprobado, rechazado o pendiente) y las condiciones de tu reserva."
    />
  );
}
