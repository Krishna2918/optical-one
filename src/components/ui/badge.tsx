import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
  {
    variants: {
      tone: {
        muted: "bg-bg-warm text-muted",
        accent: "bg-accent-soft text-accent",
        navy: "bg-navy text-navy-fg",
        lab: "bg-info-soft text-lab",
        ready: "bg-ok-soft text-ready",
        notified: "bg-warn-soft text-notified",
        delivered: "bg-ok-soft text-delivered",
        billed: "bg-bg-warm text-billed",
        paid: "bg-warn-soft text-paid",
        canceled: "bg-danger-soft text-canceled",
        warn: "bg-warn-soft text-warn",
        info: "bg-info-soft text-info",
        ok: "bg-ok-soft text-ok",
      },
    },
    defaultVariants: { tone: "muted" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
