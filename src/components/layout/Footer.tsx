import Link from "next/link";
import Image from "next/image";
import { MapPinIcon, ClockIcon, WhatsAppIcon } from "@/components/icons";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { scheduleNote } from "@/lib/catalog";
import { site } from "@/lib/site";

const NAV = [
  { href: "/servicios", label: "Servicios" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/promociones", label: "Promociones" },
  { href: "/contacto", label: "Contacto" },
  { href: "/reservar", label: "Agendar cita" },
];

const LEGAL = [
  { href: "/politica-de-reservas", label: "Política de reservas" },
  { href: "/terminos", label: "Términos y condiciones" },
  { href: "/privacidad", label: "Privacidad" },
];

export function Footer() {
  const whatsappUrl = buildWhatsAppUrl("general");

  return (
    <footer className="border-t border-brand-900 bg-brand-900 text-brand-100">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <Image
            src="/almae-logo-blanco.png"
            alt="ALMAE Terapia y Spa"
            width={140}
            height={150}
            className="h-auto w-32"
          />
          <p className="mt-3 max-w-xs text-sm leading-relaxed">
            Fisioterapia, rehabilitación y bienestar. Atención presencial con un
            profesional dedicado en {site.city}.
          </p>
        </div>

        <nav aria-label="Enlaces del sitio">
          <h2 className="mb-3 text-xs font-bold tracking-[0.18em] uppercase text-brand-300">
            Navegación
          </h2>
          <ul className="space-y-2 text-sm">
            {NAV.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-4 space-y-2 text-sm text-brand-200">
            {LEGAL.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="rounded hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="mb-3 text-xs font-bold tracking-[0.18em] uppercase text-brand-300">
            Contacto
          </h2>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <MapPinIcon className="mt-0.5 size-4 shrink-0 text-brand-300" />
              <span>{site.address}</span>
            </li>
            <li className="flex items-start gap-2">
              <ClockIcon className="mt-0.5 size-4 shrink-0 text-brand-300" />
              <span>{scheduleNote}</span>
            </li>
            <li>
              <a
                href={whatsappUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg font-semibold text-white hover:text-brand-200"
              >
                <WhatsAppIcon className="size-5 text-whatsapp" />
                919 608 174 — WhatsApp
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-brand-800/80">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-brand-200 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} {site.legalName}. Todos los derechos
            reservados.
          </p>
          <p>Precios y horarios provisionales hasta confirmación oficial.</p>
        </div>
      </div>
    </footer>
  );
}
