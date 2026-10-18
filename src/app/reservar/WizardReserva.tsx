"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ClockIcon, InfoIcon, WalletIcon } from "@/components/icons";
import type { ServicioParaWizard } from "@/app/reservar/page";

type Paso = "servicio" | "horario" | "datos";

type SlotRecibido = { inicioUtc: string; finUtc: string; etiqueta: string };

function hoyLima(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function sumarDias(fecha: string, dias: number): string {
  const base = new Date(`${fecha}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

export function WizardReserva({
  servicios,
  horizonteDias,
}: {
  servicios: ServicioParaWizard[];
  horizonteDias: number;
}) {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>("servicio");
  const [servicio, setServicio] = useState<ServicioParaWizard | null>(null);
  const [varianteId, setVarianteId] = useState<string | null>(null);
  const [fecha, setFecha] = useState(hoyLima());
  const [slots, setSlots] = useState<SlotRecibido[]>([]);
  const [hora, setHora] = useState<SlotRecibido | null>(null);
  const [cargandoHorarios, setCargandoHorarios] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minFecha = hoyLima();
  const maxFecha = sumarDias(minFecha, horizonteDias);

  const pasos: { id: Paso; numero: number; titulo: string }[] = [
    { id: "servicio", numero: 1, titulo: "Elige tu terapia" },
    { id: "horario", numero: 2, titulo: "Fecha y hora" },
    { id: "datos", numero: 3, titulo: "Tus datos" },
  ];
  const pasoActual = pasos.findIndex((p) => p.id === paso) + 1;

  async function cargarHorarios() {
    if (!servicio || !varianteId) return;
    setCargandoHorarios(true);
    setError(null);
    setHora(null);
    try {
      const respuesta = await fetch(
        `/api/disponibilidad?servicio=${encodeURIComponent(servicio.slug)}&variante=${varianteId}&fecha=${fecha}`,
      );
      const cuerpo = (await respuesta.json()) as {
        ok: boolean;
        slots?: SlotRecibido[];
        error?: string;
      };
      if (!cuerpo.ok) {
        setError("No hay horarios disponibles para esa fecha. Prueba otra.");
        setSlots([]);
      } else {
        setSlots(cuerpo.slots ?? []);
      }
    } catch {
      setError("No pudimos consultar los horarios. Intenta de nuevo.");
    } finally {
      setCargandoHorarios(false);
    }
  }

  async function confirmarReserva(datos: FormData) {
    if (!servicio || !varianteId || !hora) return;
    setEnviando(true);
    setError(null);
    try {
      const respuesta = await fetch("/api/reservas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          servicio: servicio.slug,
          variante: varianteId,
          inicio: hora.inicioUtc,
          nombre: datos.get("nombre"),
          telefono: datos.get("telefono"),
          email: datos.get("email") ?? "",
          notas: datos.get("notas") ?? "",
          consent: datos.get("consent") === "on",
        }),
      });
      const cuerpo = (await respuesta.json()) as {
        ok: boolean;
        token?: string;
        error?: string;
      };
      if (!cuerpo.ok || !cuerpo.token) {
        setError(cuerpo.error ?? "No pudimos crear la reserva.");
        setEnviando(false);
        return;
      }
      router.push(`/reserva/${cuerpo.token}`);
    } catch {
      setError("No pudimos crear la reserva. Intenta de nuevo.");
      setEnviando(false);
    }
  }

  return (
    <div className="rounded-2xl border border-sand-200 bg-white p-6 shadow-xs sm:p-8">
      <ol className="mb-8 flex items-center gap-2 text-xs font-semibold">
        {pasos.map((p) => (
          <li key={p.id} className="flex items-center gap-2">
            <span
              aria-current={paso === p.id ? "step" : undefined}
              className={`flex size-7 items-center justify-center rounded-full ${
                paso === p.id
                  ? "bg-brand-700 text-white"
                  : pasoActual > p.numero
                    ? "bg-brand-100 text-brand-800"
                    : "bg-sand-100 text-ink-500"
              }`}
            >
              {p.numero}
            </span>
            <span className={paso === p.id ? "text-ink-900" : "text-ink-500"}>
              {p.titulo}
            </span>
          </li>
        ))}
        <li className="ml-auto text-ink-500">Paso {pasoActual} de 3</li>
      </ol>

      {paso === "servicio" ? (
        <div>
          <h2 className="mb-4 font-display text-lg font-bold text-ink-900">
            ¿Qué tratamiento necesitas?
          </h2>
          <ul className="flex flex-col gap-3">
            {servicios.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    setServicio(s);
                    setVarianteId(s.variants[0]?.id ?? null);
                    setPaso("horario");
                  }}
                  className="flex w-full items-center justify-between gap-4 rounded-xl border border-sand-200 bg-sand-50 px-4 py-3.5 text-left transition-colors hover:border-brand-400 hover:bg-brand-50"
                >
                  <span>
                    <span className="block font-display text-base font-bold text-ink-900">
                      {s.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-500">
                      {s.variants.map((v) => `${v.duracionMin} min`).join(" · ")}
                    </span>
                  </span>
                  <span className="font-display text-sm font-bold text-brand-700">
                    desde S/ {s.variants[0]?.precio}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {paso === "horario" ? (
        <div>
          <h2 className="mb-4 font-display text-lg font-bold text-ink-900">
            Fecha y hora para <strong>{servicio?.name}</strong>
          </h2>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label
                htmlFor="fecha"
                className="mb-1.5 block text-sm font-semibold text-ink-900"
              >
                Fecha
              </label>
              <input
                id="fecha"
                type="date"
                value={fecha}
                min={minFecha}
                max={maxFecha}
                onChange={(e) => setFecha(e.target.value || minFecha)}
                className="rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={cargarHorarios}
              disabled={cargandoHorarios}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
            >
              {cargandoHorarios ? "Consultando…" : "Ver horarios"}
            </button>
            <button
              type="button"
              onClick={() => setPaso("servicio")}
              className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-brand-800 hover:bg-brand-50"
            >
              Cambiar servicio
            </button>
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              {error}
            </p>
          ) : null}

          {slots.length > 0 ? (
            <fieldset className="mt-6">
              <legend className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-900">
                <ClockIcon className="size-4 text-brand-600" />
                Horarios disponibles ({slots.length})
              </legend>
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.inicioUtc}
                    type="button"
                    onClick={() => {
                      setHora(slot);
                      setPaso("datos");
                    }}
                    className={`min-h-11 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                      hora?.inicioUtc === slot.inicioUtc
                        ? "border-brand-700 bg-brand-700 text-white"
                        : "border-sand-200 bg-white text-ink-900 hover:border-brand-400 hover:bg-brand-50"
                    }`}
                  >
                    {slot.etiqueta}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}
        </div>
      ) : null}

      {paso === "datos" ? (
        <form action={confirmarReserva}>
          <h2 className="mb-4 font-display text-lg font-bold text-ink-900">
            Confirma tu cita
          </h2>
          <div className="mb-5 flex items-start gap-3 rounded-xl bg-brand-50 p-4 text-sm">
            <InfoIcon className="mt-0.5 size-5 shrink-0 text-brand-700" />
            <div>
              <p className="font-semibold text-ink-900">{servicio?.name}</p>
              <p className="text-ink-700">
                {fecha} · {hora?.etiqueta} ({hora?.finUtc ? "60–90 min según servicio" : ""})
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="nombre" className="mb-1.5 block text-sm font-semibold text-ink-900">
                Nombre completo
              </label>
              <input id="nombre" name="nombre" required minLength={2} maxLength={80} className="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-sm" />
            </div>
            <div>
              <label htmlFor="telefono" className="mb-1.5 block text-sm font-semibold text-ink-900">
                Celular (WhatsApp)
              </label>
              <input id="telefono" name="telefono" required inputMode="numeric" pattern="9\d{8}" maxLength={9} placeholder="9XXXXXXXX" className="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-ink-900">
                Correo (opcional)
              </label>
              <input id="email" name="email" type="email" className="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="notas" className="mb-1.5 block text-sm font-semibold text-ink-900">
                Comentarios (opcional)
              </label>
              <textarea id="notas" name="notas" maxLength={300} rows={2} className="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-sm" />
            </div>
          </div>

          <label className="mt-4 flex items-start gap-3 text-sm text-ink-700">
            <input type="checkbox" name="consent" required className="mt-1 size-4" />
            <span>
              Autorizo que ALMAE me contacte por WhatsApp sobre esta cita y
              acepto la{" "}
              <a href="/privacidad" className="font-semibold text-brand-700 underline">
                política de privacidad
              </a>{" "}
              y la{" "}
              <a href="/politica-de-reservas" className="font-semibold text-brand-700 underline">
                política de reservas
              </a>
              .
            </span>
          </label>

          {error ? (
            <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={enviando}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
            >
              {enviando ? "Creando reserva…" : "Reservar mi horario"}
            </button>
            <button
              type="button"
              onClick={() => setPaso("horario")}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-sand-200 px-5 py-2.5 text-sm font-semibold text-ink-900 hover:bg-sand-100"
            >
              Cambiar horario
            </button>
          </div>
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-ink-500">
            <WalletIcon className="size-3.5" />
            Tras reservar, pagarás el adelanto para confirmar (simulador en
            desarrollo; pasarela real en Fase 5).
          </p>
        </form>
      ) : null}
    </div>
  );
}
