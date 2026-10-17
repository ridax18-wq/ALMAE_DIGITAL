import type { Metadata } from "next";
import { WizardReserva } from "@/app/reservar/WizardReserva";
import { PendingPage } from "@/components/ui/PendingPage";
import { PageHero } from "@/components/ui/PageHero";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "Reservar cita",
  description:
    "Elige tu servicio, mira los horarios disponibles reales y reserva tu cita en ALMAE Terapia y Spa.",
  robots: { index: true, follow: true },
};

export const dynamic = "force-dynamic";

export type ServicioParaWizard = {
  id: string;
  slug: string;
  name: string;
  variants: { id: string; duracionMin: number; precio: number }[];
};

export default async function ReservarPage() {
  const supabase = createSupabaseServiceClient();

  const { data: settings } = await supabase
    .from("business_settings")
    .select("max_advance_days")
    .limit(1)
    .maybeSingle();

  const { data: servicios } = await supabase
    .from("services")
    .select(
      "id, slug, name, variants:service_variants(id, duration_minutes, price)",
    )
    .eq("active", true)
    .eq("location", "consultorio")
    .order("sort_order");

  const disponibles: ServicioParaWizard[] = (servicios ?? [])
    .map((servicio) => ({
      id: servicio.id,
      slug: servicio.slug,
      name: servicio.name,
      variants: (servicio.variants ?? [])
        .filter((v) => Boolean(v.id))
        .map((v) => ({
          id: String(v.id),
          duracionMin: v.duration_minutes,
          precio: v.price,
        })),
    }))
    .filter((servicio) => servicio.variants.length > 0);

  if (disponibles.length === 0) {
    return (
      <>
        <PageHero
          eyebrow="Reservas"
          title="Reserva tu cita"
          description="El catálogo de servicios aún no está configurado por la administración."
        />
        <PendingPage
          title="Catálogo en preparación"
          phase="Configuración"
          message="Los servicios todavía no están configurados en la agenda. Mientras tanto, puedes coordinar tu cita por WhatsApp."
          backLabel="Ver servicios publicados"
          backHref="/servicios"
        />
      </>
    );
  }

  return (
    <>
      <PageHero
        eyebrow="Reservas"
        title="Reserva tu cita"
        description="Tres pasos simples: elige tu terapia, selecciona fecha y hora, y confirma tus datos. El pago del adelanto estará disponible próximamente."
      />
      <main className="bg-sand-50 py-10 sm:py-14">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <WizardReserva
            servicios={disponibles}
            horizonteDias={settings?.max_advance_days ?? 30}
          />
        </div>
      </main>
    </>
  );
}
