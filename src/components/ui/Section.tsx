import type { ReactNode } from "react";

const container = "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8";

export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`${container} ${className ?? ""}`}>{children}</div>;
}

type SectionProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  tone?: "plain" | "soft" | "brand";
};

const tones: Record<NonNullable<SectionProps["tone"]>, string> = {
  plain: "bg-sand-50",
  soft: "bg-sand-100",
  brand: "bg-brand-800 text-white",
};

export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
  tone = "plain",
}: SectionProps) {
  return (
    <section
      id={id}
      className={`py-14 sm:py-20 ${tones[tone]} ${className ?? ""}`}
    >
      <Container>
        <div className="mb-8 max-w-2xl sm:mb-10">
          {eyebrow ? (
            <p
              className={`mb-2 text-xs font-bold tracking-[0.18em] uppercase ${
                tone === "brand" ? "text-brand-200" : "text-brand-600"
              }`}
            >
              {eyebrow}
            </p>
          ) : null}
          <h2
            className={`font-display text-2xl font-bold text-balance sm:text-3xl ${
              tone === "brand" ? "text-white" : "text-ink-900"
            }`}
          >
            {title}
          </h2>
          {description ? (
            <p
              className={`mt-3 text-base leading-relaxed ${
                tone === "brand" ? "text-brand-100" : "text-ink-700"
              }`}
            >
              {description}
            </p>
          ) : null}
        </div>
        {children}
      </Container>
    </section>
  );
}
