import { guardarPromocion } from "@/app/admin/(protegido)/promociones/actions";

export type PromocionEditable = {
  id: string;
  code: string;
  kind: "fixed" | "percent";
  value: number;
  service_id: string | null;
  valid_from: string | null;
  valid_to: string | null;
  max_uses: number | null;
  image_media_id: string | null;
  sort_order: number;
  active: boolean;
  published: boolean;
};

export function FormularioPromocion({
  promocion,
  servicios,
  imagenes,
}: {
  promocion: PromocionEditable | null;
  servicios: { id: string; name: string }[];
  imagenes: { id: string; etiqueta: string; url: string }[];
}) {
  return (
    <form action={guardarPromocion} className="mt-6 flex flex-col gap-5">
      {promocion ? <input type="hidden" name="promocion_id" value={promocion.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="code" className="mb-1 block text-sm font-semibold text-ink-900">
            Código
          </label>
          <input
            id="code"
            name="code"
            required
            minLength={3}
            maxLength={30}
            pattern="[A-Z0-9-]+"
            placeholder="ej: VERANO20"
            defaultValue={promocion?.code ?? ""}
            className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm uppercase"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="kind" className="mb-1 block text-sm font-semibold text-ink-900">
              Tipo
            </label>
            <select
              id="kind"
              name="kind"
              defaultValue={promocion?.kind ?? "percent"}
              className="w-full rounded-xl border border-sand-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="percent">% de descuento</option>
              <option value="fixed">Descuento fijo (S/)</option>
            </select>
          </div>
          <div>
            <label htmlFor="value" className="mb-1 block text-sm font-semibold text-ink-900">
              Valor
            </label>
            <input
              id="value"
              name="value"
              type="number"
              step="0.01"
              min="0.01"
              required
              defaultValue={promocion?.value ?? ""}
              className="w-full rounded-xl border border-sand-200 bg-white px-3 py-2.5 text-sm"
            />
          </div>
        </div>
        <div>
          <label htmlFor="service_id" className="mb-1 block text-sm font-semibold text-ink-900">
            Servicio asociado (opcional)
          </label>
          <select
            id="service_id"
            name="service_id"
            defaultValue={promocion?.service_id ?? ""}
            className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
          >
            <option value="">Cualquier servicio</option>
            {servicios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="image_media_id" className="mb-1 block text-sm font-semibold text-ink-900">
            Imagen (de Multimedia)
          </label>
          <select
            id="image_media_id"
            name="image_media_id"
            defaultValue={promocion?.image_media_id ?? ""}
            className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
          >
            <option value="">Sin imagen</option>
            {imagenes.map((img) => (
              <option key={img.id} value={img.id}>
                {img.etiqueta}
              </option>
            ))}
          </select>
          {promocion?.image_media_id ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imagenes.find((i) => i.id === promocion.image_media_id)?.url ?? ""}
              alt="Imagen actual de la promoción"
              className="mt-2 h-24 w-40 rounded-lg object-cover"
            />
          ) : null}
        </div>
        <div>
          <label htmlFor="valid_from" className="mb-1 block text-sm font-semibold text-ink-900">
            Inicio (opcional)
          </label>
          <input
            id="valid_from"
            name="valid_from"
            type="date"
            defaultValue={promocion?.valid_from ?? ""}
            className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="valid_to" className="mb-1 block text-sm font-semibold text-ink-900">
            Vencimiento (opcional)
          </label>
          <input
            id="valid_to"
            name="valid_to"
            type="date"
            defaultValue={promocion?.valid_to ?? ""}
            className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="max_uses" className="mb-1 block text-sm font-semibold text-ink-900">
            Usos máximos (opcional)
          </label>
          <input
            id="max_uses"
            name="max_uses"
            type="number"
            min="1"
            max="9999"
            defaultValue={promocion?.max_uses ?? ""}
            className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="sort_order" className="mb-1 block text-sm font-semibold text-ink-900">
            Orden
          </label>
          <input
            id="sort_order"
            name="sort_order"
            type="number"
            min="0"
            max="999"
            defaultValue={promocion?.sort_order ?? 0}
            className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
          />
        </div>
        <div className="flex flex-col justify-end gap-2 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <input
              type="checkbox"
              name="active"
              defaultChecked={promocion?.active ?? true}
              className="size-4"
            />
            Activa (se muestra cuando además está publicada y vigente)
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <input
              type="checkbox"
              name="published"
              defaultChecked={promocion?.published ?? true}
              className="size-4"
            />
            Publicada (visible en el sitio público)
          </label>
        </div>
      </div>

      <button
        type="submit"
        className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
      >
        Guardar promoción
      </button>
    </form>
  );
}
