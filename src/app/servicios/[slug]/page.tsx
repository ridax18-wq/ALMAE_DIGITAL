import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Section";
import { PageHero } from "@/components/ui/PageHero";
import { CheckIcon, ClockIcon, SparkIcon, WhatsAppIcon } from "@/components/icons";
import { services, getService } from "@/lib/catalog";
import { formatPen } from "@/lib/format";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

const IMG = {
  "terapia-fisica-y-rehabilitacion-consultorio": "/servicios/terapia-fisica-consultorio.jpg",
  "terapia-fisica-y-rehabilitacion-domicilio": "/servicios/terapia-fisica-domicilio.jpg",
  "masaje-antiestres-consultorio": "/servicios/masaje-antiestres-consultorio.jpg",
  "masaje-antiestres-domicilio": "/servicios/masaje-antiestres-domicilio.jpg",
  "masaje-reductor-consultorio": "/servicios/masaje-reductor-consultorio.jpg",
  "masaje-reductor-domicilio": "/servicios/masaje-reductor-domicilio.jpg",
  "reflexologia-consultorio": "/servicios/reflexologia-consultorio.jpg",
  "reflexologia-domicilio": "/servicios/reflexologia-domicilio.jpg",
} as const;

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return { title: "Servicio no encontrado" };
  return {
    title: `${service.name} — ${service.location === "domicilio" ? "a domicilio" : "en consultorio"}`,
    description: service.tagline,
  };
}

export default async function ServicioDetallePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const image = IMG[service.slug as keyof typeof IMG];
  const esDomicilio = service.location === "domicilio";
  const whatsappUrl = buildWhatsAppUrl(
    "servicio",
    `${service.name} (${esDomicilio ? "a domicilio" : "en consultorio"})`,
  );

  return (
    <>
      <PageHero
        eyebrow="Servicio"
        title={`${service.name} — ${esDomicilio ? "a domicilio" : "en consultorio"}`}
        description={service.tagline}
      />
      <main className="bg-sand-50 py-12 sm:py-16">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <article className="rounded-2xl border border-sand-200 bg-white p-6 sm:p-8">
              <div className="relative mb-8 aspect-[16/10] overflow-hidden rounded-xl">
                {image ? (
                  <Image
                    src={image}
                    alt={`${service.name} — ALMAE Terapia y Spa`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-50 via-sand-100 to-sage-100">
                    <span className="font-display text-6xl font-extrabold text-brand-300">
                      {service.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              <h2 className="font-display text-xl font-bold text-ink-900">
                Sobre este servicio
              </h2>
              <p className="mt-3 text-base leading-relaxed text-ink-700">
                {service.description}
              </p>

              <h2 className="mt-8 font-display text-xl font-bold text-ink-900">
                Incluye
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {service.highlights.map((item) => (
                  <li
                    key={item}
                    className="inline-flex items-center gap-1.5 rounded-full border border-sand-200 bg-sand-100 px-3 py-1.5 text-sm font-medium text-ink-900"
                  >
                    <SparkIcon className="size-3.5 text-brand-600" />
                    {item}
                  </li>
                ))}
              </ul>

              <h2 className="mt-8 font-display text-xl font-bold text-ink-900">
                Antes de tu cita
              </h2>
              <ul className="mt-3 space-y-2">
                {service.instructions.map((instruction) => (
                  <li key={instruction} className="flex items-start gap-2 text-sm text-ink-700">
                    <CheckIcon className="mt-0.5 size-4 shrink-0 text-brand-600" />
                    {instruction}
                  </li>
                ))}
              </ul>
            </article>

            <aside className="h-fit rounded-2xl border border-sand-200 bg-white p-6 shadow-xs lg:sticky lg:top-24">
              <h2 className="font-display text-lg font-bold text-ink-900">
                Precios
              </h2>
              {service.variants.length > 0 ? (
                <ul className="mt-4 divide-y divide-sand-200">
                  {service.variants.map((v) => (
                    <li
                      key={v.durationMinutes}
                      className="flex items-center justify-between gap-4 py-2.5 text-sm"
                    >
                      <span className="inline-flex items-center gap-1.5 text-ink-700">
                        <ClockIcon className="size-4 text-brand-600" />
                        {v.durationMinutes} min
                        {v.provisionalDuration ? (
                          <span className="text-xs text-ink-500">(prov.)</span>
                        ) : null}
                      </span>
                      <span className="font-semibold text-ink-900">
                        {formatPen(v.priceCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 rounded-xl bg-brand-50 p-4 text-sm leading-relaxed text-ink-700">
                  Precio por confirmar. Escríbenos por WhatsApp y te informamos
                  los valores actuales.
                </p>
              )}
              {service.variants.length > 0 ? (
                <p className="mt-3 text-xs text-ink-500">
                  El adelanto para confirmar la reserva se definirá junto con el
                  sistema de pagos. El saldo se cancela en el consultorio el
                  día de tu cita.
                </p>
              ) : null}
              <div className="mt-6 flex flex-col gap-3">
                {service.bookable ? (
                  <Button href="/reservar" className="w-full">
                    Agendar esta cita
                  </Button>
                ) : (
                  <Button
                    href={whatsappUrl ?? "/contacto"}
                    variant="whatsapp"
                    external={whatsappUrl !== null}
                    className="w-full"
                  >
                    <WhatsAppIcon className="size-5" />
                    Consultar por WhatsApp
                  </Button>
                )}
                <Button href="/servicios" variant="ghost" className="w-full">
                  Ver otros servicios
                </Button>
              </div>
            </aside>
          </div>
        </Container>
      </main>
    </>
  );
}
