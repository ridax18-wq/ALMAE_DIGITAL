import type { Metadata } from "next";
import Link from "next/link";
import { cancelarMiReserva } from "@/app/reserva/[token]/actions";
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  ShieldCheckIcon,
  WalletIcon,
  WhatsAppIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { buildWhatsAppUrl, type WhatsAppIntent } from "@/lib/whatsapp";
import { formatFechaLima, formatHorarioLima, formatPen } from "@/lib/format";
import { obtenerReserva } from "@/lib/services/reservas";
import { ContadorRetencion } from "@/app/reserva/[token]/ContadorRetencion";

export const metadata: Metadata = {
  title: "Mi reserva",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const ETIQUETAS_ESTADO: Record<string, { texto: string; clases: string }> = {
  HELD: {
    texto: "Horario separado — coordinando adelanto",
    clases: "border-amber-200 bg-amber-50 text-amber-900",
  },
  PENDING_PAYMENT: {
    texto: "Pago en proceso",
    clases: "border-amber-200 bg-amber-50 text-amber-900",
  },
  CONFIRMED: {
    texto: "Cita confirmada",
    clases: "border-green-200 bg-green-50 text-green-900",
  },
  CANCELLED: {
    texto: "Reserva cancelada",
    clases: "border-sand-200 bg-sand-100 text-ink-700",
  },
  EXPIRED: {
    texto: "Reserva expirada",
    clases: "border-sand-200 bg-sand-100 text-ink-700",
  },
  COMPLETED: {
    texto: "Atención completada",
    clases: "border-brand-200 bg-brand-50 text-brand-900",
  },
  NO_SHOW: {
    texto: "Inasistencia registrada",
    clases: "border-red-200 bg-red-50 text-red-900",
  },
};

export default async function ReservaTokenPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error: errorUrl } = await searchParams;
  const reserva = await obtenerReserva(token);

  if (!reserva) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-sand-50 px-4 py-16">
        <div className="max-w-md rounded-2xl border border-sand-200 bg-white p-8 text-center shadow-xs">
          <h1 className="font-display text-2xl font-bold text-ink-900">
            No encontramos tu reserva
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-700">
            El enlace no es válido o ya expiró. Verifica el enlace que recibiste
            o escríbenos por WhatsApp y lo revisamos contigo.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              href={buildWhatsAppUrl("cita") ?? "/contacto"}
              variant="whatsapp"
              external={buildWhatsAppUrl("cita") !== null}
            >
              <WhatsAppIcon className="size-5" />
              Consultar por WhatsApp
            </Button>
            <Button href="/" variant="secondary">
              Volver al inicio
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const estado = ETIQUETAS_ESTADO[reserva.status] ?? {
    texto: reserva.status,
    clases: "border-sand-200 bg-sand-100 text-ink-700",
  };
  const saldo = reserva.amountCents - reserva.depositRequiredCents;
  const whatsappDetalle = `Código ${reserva.codigoPublico} — ${reserva.service} — ${formatFechaLima(reserva.inicioLima)} ${formatHorarioLima(reserva.inicioLima, reserva.finLima)}. Quiero coordinar el adelanto para confirmar mi cita.`;

  return (
    <main className="bg-sand-50 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6">
        <div
          role="status"
          className={`mb-5 rounded-xl border px-4 py-3 text-sm font-semibold ${estado.clases}`}
        >
          {estado.texto}
        </div>

        {errorUrl ? (
          <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorUrl}
          </p>
        ) : null}

        <div className="rounded-2xl border border-sand-200 bg-white p-6 shadow-xs sm:p-8">
          <h1 className="font-display text-2xl font-bold text-ink-900">
            {reserva.service}
          </h1>
          <p className="mt-2 inline-flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-1.5 font-mono text-sm font-bold text-brand-800">
            Código: {reserva.codigoPublico}
          </p>

          <dl className="mt-6 divide-y divide-sand-200 text-sm">
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="inline-flex items-center gap-1.5 text-ink-700">
                <CalendarIcon className="size-4 text-brand-600" />
                Fecha
              </dt>
              <dd className="font-semibold text-ink-900">
                {formatFechaLima(reserva.inicioLima)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="inline-flex items-center gap-1.5 text-ink-700">
                <ClockIcon className="size-4 text-brand-600" />
                Horario
              </dt>
              <dd className="font-semibold text-ink-900">
                {formatHorarioLima(reserva.inicioLima, reserva.finLima)} (
                {reserva.duracionMin} min)
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="inline-flex items-center gap-1.5 text-ink-700">
                <MapPinIcon className="size-4 text-brand-600" />
                Lugar
              </dt>
              <dd className="font-semibold text-ink-900">Consultorio ALMAE — Rímac</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="inline-flex items-center gap-1.5 text-ink-700">
                <WalletIcon className="size-4 text-brand-600" />
                Precio del servicio
              </dt>
              <dd className="font-semibold text-ink-900">
                {formatPen(reserva.amountCents)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-ink-700">Adelanto a coordinar</dt>
              <dd className="font-semibold text-brand-700">
                {formatPen(reserva.depositRequiredCents)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-ink-700">Saldo en consultorio</dt>
              <dd className="font-semibold text-ink-900">{formatPen(saldo)}</dd>
            </div>
          </dl>

          {reserva.status === "HELD" ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm leading-relaxed text-amber-900">
                Tu horario ha sido separado por <strong>15 minutos</strong>.
                Para confirmar tu cita, coordina el adelanto por WhatsApp. La
                reserva quedará confirmada cuando ALMAE verifique tu pago.
              </p>
              <ContadorRetencion venceIso={reserva.holdExpira} />
              <div className="mt-4">
                <Button
                  href={buildWhatsAppUrl("adelanto", whatsappDetalle) ?? "/contacto"}
                  variant="whatsapp"
                  external={buildWhatsAppUrl("adelanto", whatsappDetalle) !== null}
                  className="w-full"
                >
                  <WhatsAppIcon className="size-5" />
                  Coordinar adelanto por WhatsApp
                </Button>
              </div>
            </div>
          ) : null}

          {reserva.notes ? (
            <p className="mt-4 rounded-xl bg-sand-100 p-4 text-sm text-ink-700">
              <strong className="font-semibold text-ink-900">Tus comentarios:</strong>{" "}
              {reserva.notes}
            </p>
          ) : null}

          <p className="mt-4 inline-flex items-start gap-2 text-xs leading-relaxed text-ink-500">
            <ShieldCheckIcon className="mt-0.5 size-3.5 shrink-0" />
            La cita queda <strong>confirmada</strong> cuando ALMAE verifique tu
            adelanto y apruebe la reserva. Este enlace te permite consultar el
            estado sin crear una cuenta.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {reserva.puedeCancelar ? (
              <form action={cancelarMiReserva} className="contents">
                <input type="hidden" name="token" value={token} />
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-800 hover:bg-red-50"
                >
                  Cancelar mi reserva
                </button>
              </form>
            ) : null}
            <Button
              href={buildWhatsAppUrl("cita", `Código ${reserva.codigoPublico}`) ?? "/contacto"}
              variant="secondary"
            >
              <WhatsAppIcon className="size-5" />
              Consultar mi cita
            </Button>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-ink-500">
          Guarda este enlace para revisar tu reserva.{" "}
          <Link href="/politica-de-reservas" className="font-semibold text-brand-700 underline">
            Ver política de reservas
          </Link>
        </p>
      </div>
    </main>
  );
}
