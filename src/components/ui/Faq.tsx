import type { FaqItem } from "@/lib/catalog";

export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-sand-200 overflow-hidden rounded-2xl border border-sand-200 bg-white">
      {items.map((item) => (
        <details key={item.question} className="group px-5 py-4 sm:px-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
            <span className="font-display text-base font-semibold text-ink-900">
              {item.question}
            </span>
            <span
              aria-hidden="true"
              className="flex size-7 shrink-0 items-center justify-center rounded-full border border-brand-200 text-brand-700 transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="mt-3 pr-10 text-sm leading-relaxed text-ink-700">
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
