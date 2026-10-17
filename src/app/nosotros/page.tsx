import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Section } from "@/components/ui/Section";
import { Photo } from "@/components/ui/Photo";
import { Button } from "@/components/ui/Button";
import { CheckIcon } from "@/components/icons";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Nosotros",
  description:
    "Conoce a ALMAE Terapia y Spa: consulta de fisioterapia, rehabilitación y bienestar en Lima, con atención cercana, profesional y dedicada.",
};

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

export default function NosotrosPage() {
  return (
    <>
      <PageHero
        eyebrow="Nosotros"
        title="Bienestar con criterio, trato con calidez"
        description="ALMAE Terapia y Spa nace con la idea de que la recuperación debe explicarse con claridad y vivirse con tranquilidad: profesionales dedicados, procesos simples y trato humano."
      />
      <Section
        eyebrow="Quiénes somos"
        title="Una consulta enfocada en ti"
        tone="plain"
      >
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div className="space-y-4 text-base leading-relaxed text-ink-700">
            <p>
              Somos una consulta de fisioterapia, rehabilitación y bienestar en
              {" "}{site.city}. Atendemos de forma presencial con{" "}
              <strong className="font-semibold text-ink-900">
                {site.professional.name}
              </strong>
              , para que cada persona reciba tiempo, atención y explicaciones
              claras sobre su condición.
            </p>
            <p>
              Trabajamos con un enfoque funcional: primero entender el origen
              del problema, luego un plan de tratamiento medible y ajustable,
              y siempre con indicaciones que puedes practicar desde casa.
            </p>
            <p>
              Además de la terapia física y la rehabilitación, cuidamos el
              bienestar integral con masajes antiestrés, masaje reductor y
              reflexología facial y podal.
            </p>
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
