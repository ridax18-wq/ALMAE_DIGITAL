import Link from "next/link";
import Image from "next/image";
import { ClockIcon, MapPinIcon, ArrowRightIcon } from "@/components/icons";
import { formatPen } from "@/lib/format";
import type { Service } from "@/lib/catalog";

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

export function ServiceCard({ service }: { service: Service }) {
  const image = IMG[service.slug as keyof typeof IMG];
  const first = service.variants[0];
  const multiple = service.variants.length > 1;

  return (
    <Link
      href={`/servicios/${service.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-xs transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden border-b border-sand-200">
        {image ? (
          <Image
            src={image}
            alt={`${service.name} — ${service.location === "domicilio" ? "atención a domicilio" : "atención en consultorio"} ALMAE`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand-50 via-sand-100 to-sage-100">
            <span className="font-display text-4xl font-extrabold text-brand-300">
              {service.name.charAt(0)}
            </span>
            <span className="text-xs font-medium text-ink-500">
              Imagen del servicio
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <h3 className="font-display text-lg font-bold text-ink-900 group-hover:text-brand-700">
          {service.name}
        </h3>
        <p className="text-sm leading-relaxed text-ink-700">{service.tagline}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1.5 text-sm text-ink-700">
          <span className="inline-flex items-center gap-1.5">
            {service.location === "domicilio" ? (
              <>
                <MapPinIcon className="size-4 text-brand-600" />
                A domicilio
              </>
            ) : (
              <>
                <MapPinIcon className="size-4 text-brand-600" />
                En consultorio
              </>
            )}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ClockIcon className="size-4 text-brand-600" />
            {service.variants.length === 0
              ? "Duración a coordinar"
              : multiple
                ? service.variants
                    .map((v) => `${v.durationMinutes} min`)
                    .join(" · ")
                : first?.durationMinutes
                  ? `${first.durationMinutes} min`
                  : null}
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
          {service.variants.length === 0
            ? "Precio por consultar"
            : multiple
              ? `Desde ${formatPen(first?.price ?? 0)}`
              : formatPen(first?.price ?? 0)}
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
