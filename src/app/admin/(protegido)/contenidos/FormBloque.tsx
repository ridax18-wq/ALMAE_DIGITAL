"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { guardarBorradorContenido, publicarContenidoBloque } from "@/app/admin/(protegido)/contenidos/actions";
import type { Campo } from "@/lib/cms/bloques";

type Par = { title: string; text: string };
type ItemFaq = { question: string; answer: string };

function textoPlano(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

function listaTextoSegura(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((v): v is string => typeof v === "string") : [];
}

function listaParesSegura(valor: unknown): Par[] {
  if (!Array.isArray(valor)) return [];
  return valor.map((v) => ({
    title: textoPlano((v as Par)?.title),
    text: textoPlano((v as Par)?.text),
  }));
}

function faqSegura(valor: unknown): ItemFaq[] {
  if (!Array.isArray(valor)) return [];
  return valor.map((v) => ({
    question: textoPlano((v as ItemFaq)?.question),
    answer: textoPlano((v as ItemFaq)?.answer),
  }));
}

export function FormBloque({
  bloque,
  cuerpoInicial,
  tieneFila,
  campos,
}: {
  bloque: string;
  cuerpoInicial: Record<string, unknown>;
  tieneFila: boolean;
  campos: Campo[];
}) {
  const router = useRouter();
  const [cuerpo, setCuerpo] = useState<Record<string, unknown>>(cuerpoInicial);

  function cambiar(nombre: string, valor: unknown) {
    setCuerpo((prev) => ({ ...prev, [nombre]: valor }));
  }

  function prepararEnvio() {
    const form = document.getElementById(`form-${bloque}`) as HTMLFormElement | null;
    if (form) {
      const input = form.elements.namedItem("body") as HTMLInputElement;
      input.value = JSON.stringify(cuerpo);
    }
  }

  function renderCampo(campo: Campo) {
    const valor = cuerpo[campo.nombre];

    if (campo.tipo === "check") {
      return (
        <label key={campo.nombre} className="flex items-center gap-2 text-sm font-semibold text-ink-700">
          <input
            type="checkbox"
            checked={valor === true}
            onChange={(e) => cambiar(campo.nombre, e.target.checked)}
            className="size-4 rounded border-sand-300"
          />
          {campo.etiqueta}
        </label>
      );
    }

    if (campo.tipo === "texto") {
      return (
        <label key={campo.nombre} className="flex flex-col gap-1 text-sm font-semibold text-ink-700">
          {campo.etiqueta}
          <input
            type="text"
            maxLength={campo.max ?? 300}
            value={textoPlano(valor)}
            onChange={(e) => cambiar(campo.nombre, e.target.value)}
            className="rounded-xl border border-sand-200 bg-white px-3 py-2.5 text-sm font-normal text-ink-900"
          />
        </label>
      );
    }

    if (campo.tipo === "area") {
      return (
        <label key={campo.nombre} className="flex flex-col gap-1 text-sm font-semibold text-ink-700">
          {campo.etiqueta}
          <textarea
            rows={4}
            maxLength={2000}
            value={textoPlano(valor)}
            onChange={(e) => cambiar(campo.nombre, e.target.value)}
            className="rounded-xl border border-sand-200 bg-white px-3 py-2.5 text-sm font-normal text-ink-900"
          />
        </label>
      );
    }

    if (campo.tipo === "lista_textos") {
      const items = listaTextoSegura(valor);
      return (
        <fieldset key={campo.nombre} className="rounded-xl border border-sand-200 bg-white p-4">
          <legend className="px-1 text-sm font-semibold text-ink-700">{campo.etiqueta}</legend>
          <div className="space-y-2">
            {items.map((item, i) => (
              <input
                key={i}
                type="text"
                maxLength={80}
                aria-label={`${campo.etiqueta} ${i + 1}`}
                value={item}
                onChange={(e) => {
                  const copia = [...items];
                  copia[i] = e.target.value;
                  cambiar(campo.nombre, copia);
                }}
                className="w-full rounded-lg border border-sand-200 px-3 py-2 text-sm font-normal text-ink-900"
              />
            ))}
          </div>
        </fieldset>
      );
    }

    if (campo.tipo === "lista_pares") {
      const items = listaParesSegura(valor);
      return (
        <fieldset key={campo.nombre} className="rounded-xl border border-sand-200 bg-white p-4">
          <legend className="px-1 text-sm font-semibold text-ink-700">{campo.etiqueta}</legend>
          <div className="space-y-4">
            {items.map((par, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-sand-100 p-3">
                <p className="text-xs font-bold uppercase text-ink-500">
                  {campo.etiquetaItem} {i + 1}
                </p>
                <input
                  type="text"
                  maxLength={300}
                  aria-label={`Título ${i + 1}`}
                  value={par.title}
                  onChange={(e) => {
                    const copia = [...items];
                    copia[i] = { ...par, title: e.target.value };
                    cambiar(campo.nombre, copia);
                  }}
                  className="w-full rounded-lg border border-sand-200 px-3 py-2 text-sm font-normal"
                />
                <textarea
                  rows={2}
                  maxLength={2000}
                  aria-label={`Descripción ${i + 1}`}
                  value={par.text}
                  onChange={(e) => {
                    const copia = [...items];
                    copia[i] = { ...par, text: e.target.value };
                    cambiar(campo.nombre, copia);
                  }}
                  className="w-full rounded-lg border border-sand-200 px-3 py-2 text-sm font-normal"
                />
              </div>
            ))}
          </div>
        </fieldset>
      );
    }

    const items = faqSegura(valor);
    return (
      <fieldset key={campo.nombre} className="rounded-xl border border-sand-200 bg-white p-4">
        <legend className="px-1 text-sm font-semibold text-ink-700">{campo.etiqueta}</legend>
        <div className="space-y-4">
          {items.map((item, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-sand-100 p-3">
              <p className="text-xs font-bold uppercase text-ink-500">Pregunta {i + 1}</p>
              <input
                type="text"
                maxLength={300}
                aria-label={`Pregunta ${i + 1}`}
                value={item.question}
                onChange={(e) => {
                  const copia = [...items];
                  copia[i] = { ...item, question: e.target.value };
                  cambiar(campo.nombre, copia);
                }}
                className="w-full rounded-lg border border-sand-200 px-3 py-2 text-sm font-normal"
              />
              <textarea
                rows={3}
                maxLength={2000}
                aria-label={`Respuesta ${i + 1}`}
                value={item.answer}
                onChange={(e) => {
                  const copia = [...items];
                  copia[i] = { ...item, answer: e.target.value };
                  cambiar(campo.nombre, copia);
                }}
                className="w-full rounded-lg border border-sand-200 px-3 py-2 text-sm font-normal"
              />
            </div>
          ))}
        </div>
      </fieldset>
    );
  }

  return (
    <form id={`form-${bloque}`} action={guardarBorradorContenido} className="space-y-5">
      <input type="hidden" name="bloque" value={bloque} />
      <input type="hidden" name="body" value="" />
      {campos.map(renderCampo)}
      <div className="flex flex-wrap items-center gap-3 border-t border-sand-200 pt-5">
        <button
          type="submit"
          onClick={prepararEnvio}
          className="rounded-xl border border-brand-700 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
        >
          Guardar borrador
        </button>
        <button
          type="submit"
          formAction={publicarContenidoBloque}
          onClick={prepararEnvio}
          className="rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
        >
          Publicar cambios
        </button>
        <Link
          href={`/admin/contenidos/${bloque}/vista-previa`}
          className="rounded-xl border border-sand-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-sand-50"
        >
          Vista previa
        </Link>
        <button
          type="button"
          onClick={() => router.push("/admin/contenidos")}
          className="px-2 py-2.5 text-sm font-semibold text-ink-500 hover:text-ink-700"
        >
          Cancelar
        </button>
        {!tieneFila ? (
          <span className="text-xs text-ink-500">Sin cambios guardados: se muestra el contenido publicado actual.</span>
        ) : null}
      </div>
    </form>
  );
}
