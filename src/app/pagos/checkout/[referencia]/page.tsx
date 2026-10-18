import type { Metadata } from "next";
import { InfoIcon, ShieldCheckIcon, WalletIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { formatPen } from "@/lib/format";
import { obtenerPago } from "@/lib/payments/orquestador";
import { simuladorDisponible } from "@/lib/payments/gateway";
import {
  aprobarPago,
  rechazarPago,
  reenviarWebhookDuplicado,
} from "./actions";

export const metadata: Metadata = {
  title: "Pago (simulador)",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CheckoutSimuladoPage({
  params,
  searchParams,
}: {
  params: Promise<{ referencia: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { referencia } = await params;
  const { error: errorUrl } = await searchParams;
  const pago = await obtenerPago(referencia);

  if (!simuladorDisponible()) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-sand-50 px-4 py-16">
        <div className="max-w-md rounded-2xl border border-sand-200 bg-white p-8 text-center shadow-xs">
          <h1 className="font-display text-2xl font-bold text-ink-900">
            Checkout no disponible
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-700">
            El simulador de pagos solo existe en desarrollo. En producción se
            integrará la pasarela real (Culqi) en la Fase 5.
          </p>
        </div>
      </main>
    );
  }

  if (!pago) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-sand-50 px-4 py-16">
        <div className="max-w-md rounded-2xl border border-sand-200 bg-white p-8 text-center shadow-xs">
          <h1 className="font-display text-2xl font-bold text-ink-900">
            Pago no encontrado
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-700">
            La referencia del pago no es válida. Vuelve a tu reserva e intenta
            de nuevo.
          </p>
          <div className="mt-6 flex justify-center">
            <Button href="/" variant="secondary">
              Volver al inicio
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-sand-50 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-xl px-4 sm:px-6">
        <div
          role="status"
          className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
        >
          SIMULADOR DE PAGO — solo desarrollo; no es una pasarela real
        </div>

        {errorUrl ? (
          <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorUrl}
          </p>
        ) : null}

        <div className="rounded-2xl border border-sand-200 bg-white p-6 shadow-xs sm:p-8">
          <h1 className="font-display text-2xl font-bold text-ink-900">
            Adelanto de tu reserva
          </h1>

          <dl className="mt-6 divide-y divide-sand-200 text-sm">
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="inline-flex items-center gap-1.5 text-ink-700">
                <WalletIcon className="size-4 text-brand-600" />
                Monto a pagar
              </dt>
              <dd className="font-display text-xl font-bold text-brand-700">
                {formatPen(pago.monto)}
              </dd>
            </div>
            {pago.servicioNombre ? (
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-ink-700">Servicio</dt>
                <dd className="font-semibold text-ink-900">{pago.servicioNombre}</dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-ink-700">Referencia</dt>
              <dd className="max-w-[16rem] truncate font-mono text-xs text-ink-700">
                {pago.referencia}
              </dd>
            </div>
          </dl>

          <form action={aprobarPago} className="mt-7 flex flex-col gap-3">
            <input type="hidden" name="referencia" value={referencia} />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
            >
              <ShieldCheckIcon className="size-5" />
              Aprobar pago (simulado)
            </button>
          </form>

          <form action={rechazarPago} className="mt-3">
            <input type="hidden" name="referencia" value={referencia} />
            <button
              type="submit"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-sand-200 px-5 py-2.5 text-sm font-semibold text-ink-900 hover:bg-sand-100"
            >
              Rechazar pago (simulado)
            </button>
          </form>

          <form action={reenviarWebhookDuplicado} className="mt-3">
            <input type="hidden" name="referencia" value={referencia} />
            <button
              type="submit"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand-300 px-5 py-2.5 text-xs font-semibold text-ink-700 hover:bg-brand-50"
            >
              <InfoIcon className="size-4" />
              Enviar webhook duplicado (probar idempotencia)
            </button>
          </form>

          <p className="mt-5 text-xs leading-relaxed text-ink-500">
            Al aprobar, el simulador envía un webhook firmado (HMAC-SHA256) al
            endpoint interno; la cita se confirma solo si el match de
            monto/moneda es correcto y la reserva sigue vigente. El resultado
            real se valida server-side en la pantalla de resultado.
          </p>
        </div>
      </div>
    </main>
  );
}
