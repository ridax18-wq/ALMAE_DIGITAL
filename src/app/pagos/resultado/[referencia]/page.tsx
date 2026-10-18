import type { Metadata } from "next";
import { ShieldCheckIcon, SyncIcon, WhatsAppIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { formatPen } from "@/lib/format";
import { obtenerPago } from "@/lib/payments/orquestador";
import { RecheckAuto } from "@/app/pagos/resultado/[referencia]/RecheckAuto";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Resultado del pago",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PagosResultadoPage({
  params,
}: {
  params: Promise<{ referencia: string }>;
}) {
  const { referencia } = await params;
  const pago = await obtenerPago(referencia);

  if (!pago) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-sand-50 px-4 py-16">
        <div className="max-w-md rounded-2xl border border-sand-200 bg-white p-8 text-center shadow-xs">
          <h1 className="font-display text-2xl font-bold text-ink-900">
            Pago no encontrado
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-700">
            La referencia no es válida. Revisa el enlace o escríbenos por
            WhatsApp.
          </p>
          <div className="mt-6 flex justify-center">
            <Button href={buildWhatsAppUrl("pago") ?? "/contacto"} variant="whatsapp" external={buildWhatsAppUrl("pago") !== null}>
              <WhatsAppIcon className="size-5" />
              Ayuda con un pago
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (pago.estado === "PENDING" || pago.estado === "CREATED") {
    return (
      <main className="bg-sand-50 py-10 sm:py-14">
        <div className="mx-auto w-full max-w-xl px-4 sm:px-6">
          <div className="rounded-2xl border border-sand-200 bg-white p-8 text-center shadow-xs">
            <SyncIcon className="mx-auto size-10 text-amber-600" />
            <h1 className="mt-4 font-display text-2xl font-bold text-ink-900">
              Pago en proceso…
            </h1>
            <p className="mt-2 text-sm text-ink-700">
              Estamos esperando la confirmación del proveedor de pagos.
              Esta pantalla se actualiza sola.
            </p>
            <RecheckAuto />
          </div>
        </div>
      </main>
    );
  }

  if (pago.estado === "FAILED") {
    return (
      <main className="bg-sand-50 py-10 sm:py-14">
        <div className="mx-auto w-full max-w-xl px-4 sm:px-6">
          <div className="rounded-2xl border border-sand-200 bg-white p-8 text-center shadow-xs">
            <h1 className="font-display text-2xl font-bold text-ink-900">
              El pago no se acreditó
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-700">
              Tu pago fue rechazado por el proveedor. La cita{" "}
              <strong>no fue confirmada</strong>. Puedes intentar pagar de
              nuevo desde tu reserva (si sigue vigente) o coordinar por
              WhatsApp.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              {pago.bookingToken ? (
                <Button href={`/reserva/${pago.bookingToken}`} variant="secondary">
                  Volver a mi reserva
                </Button>
              ) : null}
              <Button
                href={buildWhatsAppUrl("pago") ?? "/contacto"}
                variant="whatsapp"
                external={buildWhatsAppUrl("pago") !== null}
              >
                Ayuda con un pago
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (pago.estado === "EXPIRED") {
    return (
      <main className="bg-sand-50 py-10 sm:py-14">
        <div className="mx-auto w-full max-w-xl px-4 sm:px-6">
          <div className="rounded-2xl border border-sand-200 bg-white p-8 text-center shadow-xs">
            <h1 className="font-display text-2xl font-bold text-ink-900">
              El pago expiró
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-700">
              La reserva temporal venció antes de acreditar el pago, así que el
              horario quedó liberado. Puedes reservar de nuevo en otro horario.
            </p>
            <div className="mt-6 flex justify-center">
              <Button href="/reservar">Reservar de nuevo</Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (pago.estado === "RECONCILIATION") {
    return (
      <main className="bg-sand-50 py-10 sm:py-14">
        <div className="mx-auto w-full max-w-xl px-4 sm:px-6">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-xs">
            <h1 className="font-display text-2xl font-bold text-amber-900">
              Pago registrado para revisión
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-amber-900">
              Tu pago llegó pero la reserva ya no estaba vigente (o el monto no
              coincide). Quedó registrado como caso de conciliación: la
              administración te contactará para reprogramar o reembolsar,
              conforme a la política de reservas.
            </p>
            <div className="mt-6 flex justify-center">
              <Button href={buildWhatsAppUrl("pago") ?? "/contacto"} variant="whatsapp" external={buildWhatsAppUrl("pago") !== null} className="bg-whatsapp text-white hover:bg-whatsapp-dark">
                <WhatsAppIcon className="size-5" />
                Contactar por WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (pago.estado !== "SUCCEEDED" || pago.bookingStatus !== "CONFIRMED") {
    return (
      <main className="bg-sand-50 py-10 sm:py-14">
        <div className="mx-auto w-full max-w-xl px-4 sm:px-6">
          <div className="rounded-2xl border border-sand-200 bg-white p-8 text-center shadow-xs">
            <h1 className="font-display text-2xl font-bold text-ink-900">
              Estado: {pago.estado}
            </h1>
            <p className="mt-2 text-sm text-ink-700">
              La cita aún no está confirmada. Escríbenos por WhatsApp si esto
              persiste.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-sand-50 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-xl px-4 sm:px-6">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center shadow-xs">
          <ShieldCheckIcon className="mx-auto size-12 text-green-700" />
          <h1 className="mt-4 font-display text-2xl font-bold text-green-900">
            ¡Pago aprobado y cita confirmada!
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-green-900">
            {pago.servicioNombre ? `${pago.servicioNombre} — ` : ""}
            Adelanto: {formatPen(pago.monto)}
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            {pago.bookingToken ? (
              <Button href={`/reserva/${pago.bookingToken}`}>
                Ver mi reserva
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
