"use client";

import { useState } from "react";

export function VistaPrevia({ children }: { children: React.ReactNode }) {
  const [movil, setMovil] = useState(false);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMovil(false)}
          aria-pressed={!movil}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${!movil ? "bg-brand-700 text-white" : "border border-sand-200 text-ink-700"}`}
        >
          Escritorio
        </button>
        <button
          type="button"
          onClick={() => setMovil(true)}
          aria-pressed={movil}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${movil ? "bg-brand-700 text-white" : "border border-sand-200 text-ink-700"}`}
        >
          Móvil
        </button>
      </div>
      <div
        className={`mx-auto overflow-hidden rounded-2xl border border-sand-200 bg-sand-50 transition-all ${movil ? "max-w-[375px]" : "max-w-full"}`}
      >
        {children}
      </div>
    </div>
  );
}
