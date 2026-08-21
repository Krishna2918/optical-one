import { cn } from "@/lib/utils";

export function Logo({
  className,
  wordmark = true,
}: {
  className?: string;
  wordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="8" className="fill-navy" />
        <path
          d="M10 20.5 16 8.5l6 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinejoin="round"
          className="text-accent-soft"
        />
        <path
          d="M10 11.5 16 23.5l6-12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinejoin="round"
          className="text-accent"
        />
      </svg>
      {wordmark ? (
        <span className="font-display text-[1.35rem] leading-none tracking-tight text-ink">
          Lumen
        </span>
      ) : null}
    </span>
  );
}
