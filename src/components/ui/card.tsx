import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[1.25rem] border border-stone-200/90 bg-white shadow-[var(--shadow)] transition-[box-shadow,border-color,transform] duration-200",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-1 pt-5 sm:px-6 sm:pt-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-[1.05rem] font-semibold tracking-tight text-stone-900", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-0.5 text-sm leading-relaxed text-stone-500", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5 pt-3 sm:px-6 sm:pb-6", className)} {...props} />;
}

/** Numbered section header used on long forms */
export function SectionBadge({ n }: { n: string }) {
  return (
    <span className="mr-2 inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-[var(--mist)] px-1.5 text-[11px] font-semibold tabular-nums text-[var(--ink)]">
      {n}
    </span>
  );
}
