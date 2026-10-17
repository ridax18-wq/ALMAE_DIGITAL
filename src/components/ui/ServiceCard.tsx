import Link from "next/link";
import { ClockIcon, ArrowRightIcon } from "@/components/icons";
import { Placeholder } from "@/components/ui/Placeholder";
import { formatPen } from "@/lib/format";
import type { Service } from "@/lib/catalog";

export function ServiceCard({ service }: { service: Service }) {
  return (
    <Link
      href={`/servicios/${service.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-xs transition-shadow hover:shadow-md"
    >
      <Placeholder
        label="Imagen del servicio"
        aspect="aspect-[16/10]"
        className="rounded-none border-0 border-b border-sand-200"
      />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="font-display text-lg font-bold text-ink-900 group-hover:text-brand-700">
          {service.name}
        </h3>
        <p className="text-sm leading-relaxed text-ink-700">{service.tagline}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-sm text-ink-700">
          <span className="inline-flex items-center gap-1.5">
            <ClockIcon className="size-4 text-brand-600" />
            {service.durationMinutes} min
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="font-semibold text-ink-900">
              {formatPen(service.price)}
            </span>
            <span className="text-xs text-ink-500">(precio provisional)</span>
          </span>
        </div>
        <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
          Ver servicio
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
