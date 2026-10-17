import { ImageOffIcon } from "@/components/icons";

export function Placeholder({
  label,
  aspect = "aspect-[4/3]",
  className,
}: {
  label: string;
  aspect?: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`${label} (imagen de demostración, no es una foto real)`}
      className={`flex items-center justify-center rounded-2xl border border-dashed border-brand-300 bg-gradient-to-br from-brand-50 via-sand-100 to-sage-100 ${aspect} ${className ?? ""}`}
    >
      <div className="flex flex-col items-center gap-1.5 px-4 text-center">
        <ImageOffIcon className="size-5 text-brand-500" />
        <span className="text-xs font-medium text-ink-500">{label}</span>
      </div>
    </div>
  );
}
