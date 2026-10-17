import type { ReactNode } from "react";
import { Container } from "@/components/ui/Section";

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="border-b border-sand-200 bg-brand-800 py-12 text-white sm:py-16">
      <Container>
        {eyebrow ? (
          <p className="mb-2 text-xs font-bold tracking-[0.18em] uppercase text-brand-200">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-3xl font-bold text-balance sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-brand-100">
            {description}
          </p>
        ) : null}
        {children ? <div className="mt-6">{children}</div> : null}
      </Container>
    </header>
  );
}
