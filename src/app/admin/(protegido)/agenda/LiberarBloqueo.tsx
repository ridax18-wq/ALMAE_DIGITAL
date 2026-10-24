"use client";

import { retirarBloqueoAdmin } from "./actions";

export function LiberarBloqueo({ blockId, fecha }: { blockId: string; fecha: string }) {
  return (
    <form
      action={retirarBloqueoAdmin}
      onSubmit={(e) => {
        if (!window.confirm("¿Liberar este horario? Quedará disponible para reservas web y presenciales.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="block_id" value={blockId} />
      <input type="hidden" name="fecha" value={fecha} />
      <button type="submit" className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-50">
        Liberar horario
      </button>
    </form>
  );
}
