import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Section";
import { PageHero } from "@/components/ui/PageHero";
import { Placeholder } from "@/components/ui/Placeholder";
import { CheckIcon, ClockIcon, ShieldCheckIcon, SparkIcon } from "@/components/icons";
import { services, getService } from "@/lib/catalog";
import { formatPen } from "@/lib/format";

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
    title: service.name,
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

  return (
    <>
      <PageHero eyebrow="Servicio" title={service.name} description={service.tagline} />
      <main className="bg-sand-50 py-12 sm:py-16">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <article className="rounded-2xl border border-sand-200 bg-white p-6 sm:p-8">
              <Placeholder
                label="Imagen del servicio"
                aspect="aspect-[16/9]"
                className="mb-6"
              />
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

              <p className="mt-8 rounded-xl bg-brand-50 p-4 text-xs leading-relaxed text-ink-700">
                Los montos mostrados son provisionales hasta confirmar los
                precios oficiales de ALMAE.
              </p>
            </article>

            <aside className="h-fit rounded-2xl border border-sand-200 bg-white p-6 shadow-xs lg:sticky lg:top-24">
              <h2 className="font-display text-lg font-bold text-ink-900">
                Resumen de reserva
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="inline-flex items-center gap-1.5 text-ink-700">
                    <ClockIcon className="size-4 text-brand-600" />
                    Duración
                  </dt>
                  <dd className="font-semibold text-ink-900">
                    {service.durationMinutes} min
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-ink-700">Precio</dt>
                  <dd className="font-semibold text-ink-900">
                    {formatPen(service.price)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="inline-flex items-center gap-1.5 text-ink-700">
                    <ShieldCheckIcon className="size-4 text-brand-600" />
                    Adelanto
                  </dt>
                  <dd className="font-semibold text-brand-700">
                    {formatPen(service.advanceAmount)}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-ink-500">
                El adelanto asegura tu horario. El saldo se cancela en el
                consultorio el día de tu cita.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <Button href="/reservar" className="w-full">
                  Agendar esta cita
                </Button>
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
