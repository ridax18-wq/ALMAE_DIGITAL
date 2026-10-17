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
  HeartIcon,
  InfoIcon,
  MapPinIcon,
  SparkIcon,
  WalletIcon,
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
                Tu bienestar comienza con el movimiento
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-brand-100 sm:text-lg">
                En ALMAE te acompañamos con atención personalizada en
                fisioterapia, rehabilitación y bienestar, para ayudarte a
                recuperar movimiento, funcionalidad y calidad de vida.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button href="/reservar" className="text-base">
                  <CalendarIcon className="size-5" />
                  Agendar mi cita
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
        id="como-funciona"
        eyebrow="Cómo funciona"
        title="Reservar tu cita es muy simple"
        tone="plain"
      >
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: <HeartIcon className="size-6" />, title: "Elige tu terapia", text: "Selecciona el servicio que necesitas entre nuestros tratamientos." },
            { icon: <CalendarIcon className="size-6" />, title: "Selecciona fecha y hora", text: "Verás los horarios disponibles y reservas el que mejor te acomode." },
            { icon: <WalletIcon className="size-6" />, title: "Realiza tu adelanto", text: "Un adelanto seguro asegura tu horario; el saldo se paga en el consultorio." },
            { icon: <CheckIcon className="size-6" />, title: "Recibe tu confirmación", text: "Tu cita queda confirmada y guardas el enlace para revisarla o reprogramarla." },
          ].map((paso, index) => (
            <li key={paso.title} className="rounded-2xl border border-sand-200 bg-white p-5 shadow-xs">
              <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                {paso.icon}
              </span>
              <p className="mb-1 text-xs font-bold tracking-[0.18em] uppercase text-brand-600">
                Paso {index + 1}
              </p>
              <h3 className="font-display text-base font-bold text-ink-900">
                {paso.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-700">
                {paso.text}
              </p>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-dashed border-brand-300 bg-brand-50 p-4 text-sm text-ink-700">
          <InfoIcon className="mt-0.5 size-5 shrink-0 text-brand-600" />
          <p>
            <strong className="font-semibold text-ink-900">Reserva en línea en preparación.</strong>{" "}
            Mientras la conectamos con la agenda y los pagos, puedes escribirnos
            por WhatsApp y coordinamos tu cita personalmente.
          </p>
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
        <div className="mx-auto max-w-3xl">
          <Photo
            src="/fotos/consultorio-luminoso.jpg"
            alt="Consultorio ALMAE Terapia y Spa, limpio y luminoso, con camilla preparada"
            aspect="aspect-[16/9]"
            sizes="(max-width: 1024px) 100vw, 768px"
          />
        </div>
      </Section>

      <Section
        id="promociones"
        eyebrow="Promociones"
        title="Beneficios y novedades"
        tone="soft"
      >
        <div className="rounded-2xl border border-dashed border-brand-300 bg-white p-8 text-center">
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-ink-700">
            No publicamos ofertas sin aprobación y configuración administrativa.
            Cuando existan promociones vigentes, las encontrarás aquí y en
            nuestra página de promociones.
          </p>
          <div className="mt-6">
            <Button href="/promociones" variant="secondary">
              Ver promociones
            </Button>
          </div>
        </div>
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
