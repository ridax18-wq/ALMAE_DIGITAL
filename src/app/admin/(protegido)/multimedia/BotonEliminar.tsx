"use client";

export function BotonEliminar() {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!window.confirm("¿Seguro que quieres eliminar esta imagen?")) {
          e.preventDefault();
        }
      }}
      className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-50"
    >
      Eliminar
    </button>
  );
}
