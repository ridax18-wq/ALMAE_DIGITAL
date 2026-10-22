import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";
import { Photo } from "@/components/ui/Photo";
import { Button } from "@/components/ui/Button";
import { CheckIcon } from "@/components/icons";
import { site } from "@/lib/site";
import { obtenerCuerpoPublicado } from "@/lib/cms/contenido-publico";

export const metadata: Metadata = {
  title: "Nosotros",
  description:
    "Conoce a ALMAE Terapia y Spa: consulta de fisioterapia, rehabilitación y bienestar en Lima, con atención cercana, profesional y dedicada.",
};

export const dynamic = "force-dynamic";

const VALORES = [
  {
    title: "Cercanía",
    text: "Tratamos a cada persona como persona, no como expediente. Escuchamos antes de indicar.",
  },
  {
    title: "Profesionalismo",
    text: "Tratamiento basado en evidencia, con objetivos claros y seguimiento real de tu progreso.",
  },
  {
    title: "Simplicidad",
    text: "Reservar, confirmar y llegar a tu cita debe ser sencillo. Nosotros nos encargamos del resto.",
  },
];

export default async function NosotrosPage() {
  const intro = await obtenerCuerpoPublicado("intro_nosotros");

  return (
    <>
      <PageHero
        eyebrow="Nosotros"
        title={intro.hero_title}
        description={intro.hero_description}
      />
      <Section
        eyebrow="Quiénes somos"
        title={intro.seccion_title}
        tone="plain"
      >
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div className="space-y-4 text-base leading-relaxed text-ink-700">
            {intro.parrafos.map((parrafo, i) => (
              <p key={i}>{parrafo}</p>
            ))}
          </div>
          <Photo
            src="/fotos/especialista-letrero.jpg"
            alt={`${site.professional.name}, ${site.professional.title}, junto al letrero de ALMAE`}
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
      </Section>
      <Section eyebrow="Nuestros valores" title="Lo que nos mueve" tone="soft">
        <ul className="grid gap-4 sm:grid-cols-3">
          {VALORES.map((valor) => (
            <li
              key={valor.title}
              className="rounded-2xl border border-sand-200 bg-white p-6 shadow-xs"
            >
              <h3 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
                <CheckIcon className="size-4 text-brand-600" />
                {valor.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                {valor.text}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <Button href="/servicios">Conocer los servicios</Button>
        </div>
      </Section>
    </>
  );
}
