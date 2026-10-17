import type { Metadata } from "next";
import { PendingPage } from "@/components/ui/PendingPage";

export const metadata: Metadata = {
  title: "Detalle de reserva",
  robots: { index: false, follow: false },
};

export default async function ReservaTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await params;
  return (
    <PendingPage
      title="Consulta de reservas, muy pronto"
      phase="Fase 3"
      message="Aquí podrás ver el estado de tu reserva, las condiciones de tu cita y solicitar cambios, usando el enlace personalizado que recibirás al reservar."
    />
  );
}
