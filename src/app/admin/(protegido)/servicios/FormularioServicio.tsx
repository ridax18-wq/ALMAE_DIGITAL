import { guardarServicio } from "@/app/admin/(protegido)/servicios/actions";

export type VarianteEditable = {
  id: string;
  duracion: number;
  prep: number;
  precio: number;
  adelanto: number | null;
  reservable: boolean;
};

export function FormularioServicio({
  servicio,
  imagenes,
}: {
  servicio: {
    id: string;
    slug: string;
    name: string;
    description: string;
    location: "consultorio" | "domicilio";
    active: boolean;
    instructions: string;
    sort_order: number;
    catalog_mode: string;
    image_media_id: string | null;
    variantes: VarianteEditable[];
  } | null;
  imagenes: { id: string; etiqueta: string; url: string }[];
}) {
  const variantes = servicio?.variantes ?? [];
  const filas = variantes.length > 0 ? variantes : [{ id: "", duracion: 60, prep: 0, precio: 0, adelanto: null, reservable: false }];

  return (
    <form action={guardarServicio} className="mt-6 flex flex-col gap-5">
      {servicio ? <input type="hidden" name="servicio_id" value={servicio.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-semibold text-ink-900">
            Nombre
          </label>
          <input
            id="name"
            name="name"
            required
            minLength={2}
            maxLength={80}
            defaultValue={servicio?.name ?? ""}
            className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="slug" className="mb-1 block text-sm font-semibold text-ink-900">
            Slug (URL)
          </label>
          <input
            id="slug"
            name="slug"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            defaultValue={servicio?.slug ?? ""}
            placeholder="ej: terapia-fisica-consultorio"
            className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="location" className="mb-1 block text-sm font-semibold text-ink-900">
            Modalidad
          </label>
          <select
            id="location"
            name="location"
            defaultValue={servicio?.location ?? "consultorio"}
            className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
          >
            <option value="consultorio">En consultorio</option>
            <option value="domicilio">A domicilio</option>
          </select>
        </div>
        <div>
          <label htmlFor="sort_order" className="mb-1 block text-sm font-semibold text-ink-900">
            Orden en el catálogo
          </label>
          <input
            id="sort_order"
            name="sort_order"
            type="number"
            min="0"
            max="99"
            defaultValue={servicio?.sort_order ?? 50}
            className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="catalog_mode" className="mb-1 block text-sm font-semibold text-ink-900">
            Modo en el catálogo
          </label>
          <select
            id="catalog_mode"
            name="catalog_mode"
            defaultValue={servicio?.catalog_mode ?? "reservable"}
            className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
          >
            <option value="reservable">Visible y reservable en línea</option>
            <option value="visible">Solo visible (sin reserva en línea)</option>
            <option value="consulta">Solo consulta por WhatsApp</option>
          </select>
        </div>
        <div>
          <label htmlFor="image_media_id" className="mb-1 block text-sm font-semibold text-ink-900">
            Imagen principal
          </label>
          <select
            id="image_media_id"
            name="image_media_id"
            defaultValue={servicio?.image_media_id ?? ""}
            className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
          >
            <option value="">Sin imagen (usa la predeterminada)</option>
            {imagenes.map((img) => (
              <option key={img.id} value={img.id}>
                {img.etiqueta}
              </option>
            ))}
          </select>
          {servicio?.image_media_id ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imagenes.find((i) => i.id === servicio.image_media_id)?.url ?? ""}
              alt="Imagen actual del servicio"
              className="mt-2 h-24 w-40 rounded-lg object-cover"
            />
          ) : null}
        </div>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <input
              type="checkbox"
              name="active"
              defaultChecked={servicio?.active ?? true}
              className="size-4"
            />
            Activo (visible en el sitio público)
          </label>
        </div>
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-semibold text-ink-900">
          Descripción
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={600}
          defaultValue={servicio?.description ?? ""}
          className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
        />
      </div>

      <div>
        <label htmlFor="instructions" className="mb-1 block text-sm font-semibold text-ink-900">
          Instrucciones previas
        </label>
        <textarea
          id="instructions"
          name="instructions"
          rows={2}
          maxLength={400}
          defaultValue={servicio?.instructions ?? ""}
          className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
        />
      </div>

      <fieldset>
        <legend className="mb-2 block text-sm font-bold text-ink-900">
          Duraciones y precios
        </legend>
        {filas.map((variante, index) => (
          <div
            key={variante.id || `nueva-${index}`}
            className="mb-3 grid gap-3 rounded-xl border border-sand-200 bg-sand-50 p-4 sm:grid-cols-4"
          >
            <div>
              <label htmlFor={`v_${index}_duration`} className="mb-1 block text-xs font-semibold text-ink-700">
                Duración (min)
              </label>
              <input
                id={`v_${index}_duration`}
                name={`v_${index}_duration`}
                type="number"
                min="10"
                max="240"
                required
                defaultValue={variante.duracion}
                className="w-full rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor={`v_${index}_prep`} className="mb-1 block text-xs font-semibold text-ink-700">
                Prep. adicional
              </label>
              <input
                id={`v_${index}_prep`}
                name={`v_${index}_prep`}
                type="number"
                min="0"
                max="60"
                defaultValue={variante.prep}
                className="w-full rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor={`v_${index}_price`} className="mb-1 block text-xs font-semibold text-ink-700">
                Precio (S/)
              </label>
              <input
                id={`v_${index}_price`}
                name={`v_${index}_price`}
                type="number"
                step="0.10"
                min="0.10"
                required
                defaultValue={variante.precio || ""}
                className="w-full rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor={`v_${index}_advance`} className="mb-1 block text-xs font-semibold text-ink-700">
                Adelanto (opcional)
              </label>
              <input
                id={`v_${index}_advance`}
                name={`v_${index}_advance`}
                type="number"
                step="0.10"
                min="0"
                defaultValue={variante.adelanto ?? ""}
                className="w-full rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>
        ))}
      </fieldset>

      <button
        type="submit"
        className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
      >
        Guardar servicio
      </button>
    </form>
  );
}
