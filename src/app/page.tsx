import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { Container, Section } from "@/components/ui/Section";
import { ServiceCard } from "@/components/ui/ServiceCard";
import { Faq } from "@/components/ui/Faq";
import { Photo } from "@/components/ui/Photo";
import {
  Placeholder,
} from "@/components/ui/Placeholder";
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  MapPinIcon,
  SparkIcon,
  WhatsAppIcon,
} from "@/components/icons";
import { faqs, scheduleNote, services } from "@/lib/catalog";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Fisioterapia y rehabilitación en Lima — reserve en línea",
  description:
    "Terapia física y rehabilitación, masajes, acupuntura y reflexología en Lima, en consultorio y a domicilio. Consulta horarios disponibles y confirma tu cita en minutos.",
};

export default function HomePage() {
  const whatsappUrl = buildWhatsAppUrl("orientacion");
  const featured = services.filter((s) => s.bookable).slice(0, 3);

  return (
    <>
      <section className="bg-brand-800 py-14 text-white sm:py-20">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-700 px-3 py-1.5 text-xs font-semibold text-brand-100">
                <SparkIcon className="size-4" />
                Fisioterapia, rehabilitación y bienestar — {site.subtitle}
              </p>
              <h1 className="font-display text-3xl leading-tight font-extrabold text-balance sm:text-4xl lg:text-5xl">
                Tu recuperación empieza con una reserva clara y sin trabas
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-brand-100 sm:text-lg">
                Elige tu servicio, mira los horarios disponibles reales y
                confirma tu cita con un adelanto seguro. Atención presencial en{" "}
                <strong className="font-semibold text-white">Lima</strong>, con{" "}
                {site.professional.name} para ti.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button href="/reservar" className="text-base">
                  <CalendarIcon className="size-5" />
                  Agendar cita
                </Button>
                {whatsappUrl ? (
                  <Button href={whatsappUrl} variant="secondary" external>
                    <WhatsAppIcon className="size-5 text-whatsapp" />
                    Consultar por WhatsApp
                  </Button>
                ) : null}
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-brand-100">
                <li className="inline-flex items-center gap-1.5">
                  <CheckIcon className="size-4 text-brand-300" />
                  Confirmación inmediata
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <CheckIcon className="size-4 text-brand-300" />
                  Horarios en tiempo real
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <CheckIcon className="size-4 text-brand-300" />
                  Adelanto reembolsable según política
                </li>
              </ul>
            </div>
            <div className="order-first lg:order-last">
              <Photo
                src="/fotos/consultorio-luminoso.jpg"
                alt="Consultorio ALMAE Terapia y Spa, limpio y luminoso, con camilla preparada"
                aspect="aspect-[5/4]"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </Container>
      </section>

      <Section
        id="servicios"
        eyebrow="Servicios"
        title="Tratamientos pensados para tu recuperación"
        description="Cada atención es presencial y con dedicación profesional. Los precios publicados son provisionales hasta confirmar los montos oficiales."
        tone="soft"
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((service) => (
            <ServiceCard key={service.slug} service={service} />
          ))}
        </div>
        <div className="mt-8">
          <Button href="/servicios" variant="secondary">
            Ver todos los servicios
          </Button>
        </div>
      </Section>

      <Section
        id="especialista"
        eyebrow="Tu especialista"
        title="Atención profesional dedicada"
        tone="plain"
      >
        <div className="grid items-center gap-8 lg:grid-cols-[300px_1fr]">
          <Photo
            src="/fotos/retrato-directora.jpg"
            alt={`${site.professional.name}, en el consultorio ALMAE`}
            aspect="aspect-[16/10]"
            sizes="(max-width: 1024px) 100vw, 400px"
          />
          <div>
            <p className="font-display text-xl font-bold text-ink-900">
              {site.professional.name}
            </p>
            <p className="mt-1 text-sm font-semibold text-brand-600">
              {site.professional.title} — {site.subtitle}
            </p>
            <p className="mt-4 text-base leading-relaxed text-ink-700">
              Cada sesión es atendida personalmente por nuestra profesional:
              valoración cuidadosa, explicación clara de tu condición y un plan
              de trabajo realista, con técnicas manuales y los equipos
              adecuados para cada caso.
            </p>
            <h3 className="mt-6 text-sm font-bold tracking-wide uppercase text-ink-700">
              Equipamiento
            </h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {site.equipment.map((equipo) => (
                <li
                  key={equipo}
                  className="rounded-full border border-sand-200 bg-sand-100 px-3 py-1.5 text-sm font-medium text-ink-900"
                >
                  {equipo}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section
        id="consultorio"
        eyebrow="El consultorio"
        title="Un espacio preparado para tu recuperación"
        tone="soft"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Photo
            src="/fotos/consultorio-luminoso.jpg"
            alt="Consultorio ALMAE limpio y luminoso"
            sizes="(max-width: 640px) 100vw, 33vw"
          />
          <Photo
            src="/fotos/consultorio-atencion.jpg"
            alt="Área de atención del consultorio ALMAE"
            sizes="(max-width: 640px) 100vw, 33vw"
          />
          <Photo
            src="/fotos/especialista-letrero.jpg"
            alt={`${site.professional.name} junto al letrero de ALMAE Terapia y Spa`}
            sizes="(max-width: 640px) 100vw, 33vw"
          />
        </div>
        <p className="mt-4 text-xs text-ink-500">
          Pronto agregaremos más fotografías del espacio.
        </p>
      </Section>

      <Section
        id="testimonios"
        eyebrow="Testimonios"
        title="Historias reales, con permiso"
        tone="plain"
      >
        <div className="rounded-2xl border border-dashed border-brand-300 bg-white p-8 text-center">
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-ink-700">
            Esta sección permanecerá desactivada hasta contar con testimonios
            reales y con el consentimiento expreso de cada paciente. No
            publicamos testimonios ni fotos de pacientes sin autorización.
          </p>
        </div>
      </Section>

      <Section
        id="faq"
        eyebrow="Preguntas frecuentes"
        title="Dudas comunes antes de reservar"
        tone="soft"
      >
        <Faq items={faqs} />
      </Section>

      <Section
        id="ubicacion"
        eyebrow="Ubicación"
        title="Encuéntranos en Lima"
        tone="plain"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <Placeholder
            label="Mapa de ubicación"
            aspect="aspect-[16/10]"
            className="border-solid"
          />
          <div className="rounded-2xl border border-sand-200 bg-white p-6">
            <h3 className="font-display text-lg font-bold text-ink-900">
              Información de visita
            </h3>
            <ul className="mt-4 space-y-4 text-sm text-ink-700">
              <li className="flex items-start gap-3">
                <MapPinIcon className="mt-0.5 size-5 shrink-0 text-brand-600" />
                <span>
                  <strong className="font-semibold text-ink-900">
                    Dirección:
                  </strong>{" "}
                  {site.address}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <ClockIcon className="mt-0.5 size-5 shrink-0 text-brand-600" />
                <span>
                  <strong className="font-semibold text-ink-900">
                    Horario:
                  </strong>{" "}
                  {scheduleNote}
                </span>
              </li>
            </ul>
            <div className="mt-6">
              <Button href="/reservar">Agendar mi cita</Button>
            </div>
          </div>
        </div>
      </Section>

      <section className="bg-brand-700 py-14 text-white sm:py-16">
        <Container className="text-center">
          <h2 className="font-display text-2xl font-bold text-balance sm:text-3xl">
            ¿Listo para empezar tu recuperación?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">
            Reserva tu cita en minutos: eliges horario, confirmas con el
            adelanto y tu espacio queda asegurado.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button href="/reservar" variant="secondary" className="text-base">
              Agendar cita
            </Button>
            {whatsappUrl ? (
              <Button
                href={whatsappUrl}
                variant="whatsapp"
                external
                className="text-base"
              >
                <WhatsAppIcon className="size-5" />
                Hacer una consulta
              </Button>
            ) : null}
          </div>
        </Container>
      </section>
    </>
  );
}
