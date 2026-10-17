import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Container } from "@/components/ui/Section";
import { ServiceCard } from "@/components/ui/ServiceCard";
import { services } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Servicios de fisioterapia, masajes y bienestar",
  description:
    "Terapia física y rehabilitación, masaje antiestrés, masaje reductor y reflexología facial y podal en Lima. Duración, precios y adelanto para confirmar tu reserva.",
};

export default function ServiciosPage() {
  return (
    <>
      <PageHero
        eyebrow="Servicios"
        title="Servicios para tu recuperación y bienestar"
        description="Cada atención es presencial y con dedicación profesional. Los precios publicados son provisionales hasta confirmar los montos oficiales."
      />
      <main className="bg-sand-50 py-12 sm:py-16">
        <Container>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <ServiceCard key={service.slug} service={service} />
            ))}
          </div>
        </Container>
      </main>
    </>
  );
}
