import { WhatsAppIcon } from "@/components/icons";
import { obtenerConfiguracionPublica } from "@/lib/cms/config-publica";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export async function WhatsAppButton() {
  const config = await obtenerConfiguracionPublica();
  const url = buildWhatsAppUrl("general", undefined, {
    numero: config.whatsapp || undefined,
    mensaje: config.whatsappMensaje || undefined,
  });
  const href = url ?? "/contacto";
  const isExternal = url !== null;

  return (
    <a
      href={href}
      {...(isExternal
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
      aria-label="Contactar por WhatsApp"
      className="fixed right-4 bottom-4 z-50 flex min-h-14 items-center gap-2 rounded-full bg-whatsapp px-5 text-sm font-bold text-white shadow-lg shadow-brand-900/20 transition-colors hover:bg-whatsapp-dark sm:right-6 sm:bottom-6"
    >
      <WhatsAppIcon className="size-6" />
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}
