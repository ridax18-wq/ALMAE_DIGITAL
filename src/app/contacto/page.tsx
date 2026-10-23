import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { Container } from "@/components/ui/Section";
import { MapPinIcon, ClockIcon, WhatsAppIcon, InfoIcon } from "@/components/icons";
import { scheduleNote } from "@/lib/catalog";
import { buildWhatsAppUrl, type WhatsAppIntent } from "@/lib/whatsapp";
import { site } from "@/lib/site";
import { obtenerCuerpoPublicado } from "@/lib/cms/contenido-publico";
import { obtenerConfiguracionPublica, urlBusquedaMaps } from "@/lib/cms/config-publica";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Contacta a ALMAE por WhatsApp: consultas por servicios, orientación, citas, paquetes o ayuda con un pago. Atención presencial en Lima.",
};

const ACCIONES: { intent: WhatsAppIntent; label: string; detail?: string }[] = [
  { intent: "servicio", label: "Consultar por un servicio" },
  { intent: "orientacion", label: "Solicitar orientación" },
  { intent: "cita", label: "Consultar una cita" },
  { intent: "paquetes", label: "Consultar paquetes" },
  { intent: "pago", label: "Ayuda con un pago" },
];

export default async function ContactoPage() {
  const [intro, config] = await Promise.all([
    obtenerCuerpoPublicado("contacto_intro"),
    obtenerConfiguracionPublica(),
  ]);

  const override = {
    numero: config.whatsapp || undefined,
    mensaje: config.whatsappMensaje || undefined,
  };
  const whatsappUrl = buildWhatsAppUrl("general", undefined, override);
  const numeroConfigurado = whatsappUrl !== null;
  const direccion = config.direccionCompleta || site.address;
  const horario = config.hoursNote || scheduleNote;

  return (
    <>
      <PageHero
        eyebrow="Contacto"
        title={intro.title}
        description={intro.description}
      />
      <main className="bg-sand-50 py-12 sm:py-16">
        <Container className="max-w-3xl">
          {!numeroConfigurado ? (
            <div className="mb-8 flex items-start gap-3 rounded-xl border border-dashed border-brand-300 bg-brand-50 p-4 text-sm text-ink-700">
              <InfoIcon className="mt-0.5 size-5 shrink-0 text-brand-600" />
              <p>
                El número de WhatsApp de ALMAE se activará cuando se confirme
                el contacto oficial (dato de demostración por ahora).
              </p>
            </div>
          ) : null}

          <div className="rounded-2xl border border-sand-200 bg-white p-6 shadow-xs sm:p-8">
            <h2 className="font-display text-xl font-bold text-ink-900">
              ¿Qué necesitas hoy?
            </h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {ACCIONES.map((accion) => {
                const url = buildWhatsAppUrl(accion.intent, accion.detail, {
                  numero: override.numero,
                });
                if (!url) return null;
                return (
                  <li key={accion.label}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-12 items-center gap-3 rounded-xl border border-sand-200 bg-sand-50 px-4 py-3 text-sm font-semibold text-ink-900 transition-colors hover:border-whatsapp hover:bg-sage-100"
                    >
                      <WhatsAppIcon className="size-5 text-whatsapp" />
                      {accion.label}
                    </a>
                  </li>
                );
              })}
            </ul>
            {!numeroConfigurado ? (
              <p className="mt-5 text-xs text-ink-500">
                Los accesos por WhatsApp aparecerán al configurar el número
                oficial.
              </p>
            ) : null}
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-sand-200 bg-white p-6 shadow-xs">
              <h3 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
                <ClockIcon className="size-5 text-brand-600" />
                Horario de atención
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                {horario}
              </p>
            </div>
            <div className="rounded-2xl border border-sand-200 bg-white p-6 shadow-xs">
              <h3 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
                <MapPinIcon className="size-5 text-brand-600" />
                Ubicación
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                {direccion}
                {config.direccionReferencia ? (
                  <span className="mt-1 block text-ink-500">
                    {config.direccionReferencia}
                  </span>
                ) : null}
              </p>
              <a
                href={urlBusquedaMaps(direccion)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex rounded-xl border border-sand-300 px-4 py-2 text-sm font-semibold text-ink-700 transition-colors hover:bg-sand-50"
              >
                Buscar en Google Maps
              </a>
            </div>
          </div>
        </Container>
      </main>
    </>
  );
}
