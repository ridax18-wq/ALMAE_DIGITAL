"use client";

import { useState } from "react";

export function SelectorViewport() {
  const [movil, setMovil] = useState(false);

  return (
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
  );
}

export function MarcoViewport({ children }: { children: React.ReactNode }) {
  const [movil, setMovil] = useState(false);
  void movil;
  void setMovil;
  return <>{children}</>;
}
