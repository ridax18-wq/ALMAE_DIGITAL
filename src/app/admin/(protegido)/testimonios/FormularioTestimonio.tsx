import { guardarTestimonio } from "@/app/admin/(protegido)/testimonios/actions";

export type TestimonioEditable = {
  id: string;
  patient_name: string;
  quote: string;
  rating: number | null;
  media_id: string | null;
  patient_consent: boolean;
  status: string;
};

export function FormularioTestimonio({
  testimonio,
  imagenes,
}: {
  testimonio: TestimonioEditable | null;
  imagenes: { id: string; etiqueta: string; url: string }[];
}) {
  return (
    <form action={guardarTestimonio} className="mt-6 flex flex-col gap-5">
      {testimonio ? <input type="hidden" name="testimonio_id" value={testimonio.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="patient_name" className="mb-1 block text-sm font-semibold text-ink-900">
            Nombre del paciente
          </label>
          <input
            id="patient_name"
            name="patient_name"
            required
            minLength={2}
            maxLength={80}
            defaultValue={testimonio?.patient_name ?? ""}
            className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="rating" className="mb-1 block text-sm font-semibold text-ink-900">
            Calificación (opcional)
          </label>
          <select
            id="rating"
            name="rating"
            defaultValue={testimonio?.rating?.toString() ?? ""}
            className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
          >
            <option value="">Sin calificación</option>
            <option value="1">1 estrella</option>
            <option value="2">2 estrellas</option>
            <option value="3">3 estrellas</option>
            <option value="4">4 estrellas</option>
            <option value="5">5 estrellas</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="quote" className="mb-1 block text-sm font-semibold text-ink-900">
            Testimonio
          </label>
          <textarea
            id="quote"
            name="quote"
            rows={3}
            required
            minLength={10}
            maxLength={500}
            defaultValue={testimonio?.quote ?? ""}
            className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="media_id" className="mb-1 block text-sm font-semibold text-ink-900">
            Foto (opcional, desde Multimedia)
          </label>
          <select
            id="media_id"
            name="media_id"
            defaultValue={testimonio?.media_id ?? ""}
            className="w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm"
          >
            <option value="">Sin foto</option>
            {imagenes.map((img) => (
              <option key={img.id} value={img.id}>
                {img.etiqueta}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col justify-end gap-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <input
              type="checkbox"
              name="patient_consent"
              defaultChecked={testimonio?.patient_consent ?? false}
              className="size-4"
            />
            Consentimiento expreso del paciente registrado
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <input
              type="checkbox"
              name="status"
              value="published"
              defaultChecked={testimonio?.status === "published"}
              className="size-4"
            />
            Publicar en el sitio (requiere consentimiento)
          </label>
        </div>
      </div>

      <button
        type="submit"
        className="rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
      >
        Guardar testimonio
      </button>
    </form>
  );
}
