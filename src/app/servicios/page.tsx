import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Container } from "@/components/ui/Section";
import { ServiceCard } from "@/components/ui/ServiceCard";
import { obtenerCatalogo, type ServicioPublico } from "@/lib/services/catalogo-publico";
import { obtenerCuerpoPublicado } from "@/lib/cms/contenido-publico";

export const metadata: Metadata = {
  title: "Servicios de fisioterapia, masajes y bienestar",
  description:
    "Terapia física y rehabilitación, masaje antiestrés, masaje reductor, reflexología, acupuntura y entrenamiento físico en Lima. En consultorio y a domicilio.",
};

function Grupo({
  titulo,
  descripcion,
  grupo,
}: {
  titulo: string;
  descripcion: string;
  grupo: ServicioPublico[];
}) {
  return (
    <div>
      <h2 className="font-display text-xl font-bold text-ink-900 sm:text-2xl">
        {titulo}
      </h2>
      <p className="mt-1.5 mb-6 text-sm leading-relaxed text-ink-700">
        {descripcion}
      </p>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {grupo.map((service) => (
          <ServiceCard key={service.slug} service={service} />
        ))}
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

export default async function ServiciosPage() {
  const [catalogo, intro] = await Promise.all([
    obtenerCatalogo(),
    obtenerCuerpoPublicado("servicios_intro"),
  ]);

  return (
    <>
      <PageHero
        eyebrow="Servicios"
        title={intro.title}
        description={intro.description}
      />
      <main className="bg-sand-50 py-12 sm:py-16">
        <Container>
          <div className="flex flex-col gap-12">
            <Grupo
              titulo="En consultorio"
              descripcion="Altos del Rímac 250, Rímac. Reserva en línea disponible para estos servicios."
              grupo={catalogo.filter((s) => s.location === "consultorio")}
            />
            <Grupo
              titulo="A domicilio"
              descripcion="Llevamos el equipo profesional a tu casa. El horario y la zona se coordinan por WhatsApp."
              grupo={catalogo.filter((s) => s.location === "domicilio")}
            />
          </div>
        </Container>
      </main>
    </>
  );
}
