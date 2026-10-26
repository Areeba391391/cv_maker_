import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold shadow-none select-none transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50 hover:-translate-y-px active:translate-y-0 active:scale-[0.99]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--signal)] !text-white shadow-sm hover:bg-[var(--signal-deep)] hover:shadow-[0_10px_24px_rgba(255,92,53,0.35)] [&_svg]:!text-white",
        secondary:
          "bg-[var(--ink)] !text-white hover:bg-[#152038] hover:shadow-[0_10px_24px_rgba(11,20,38,0.28)] [&_svg]:!text-white",
        outline:
          "border border-[var(--border)] bg-white !text-[var(--ink)] hover:border-[var(--cobalt)] hover:bg-[#f3f7fb] hover:shadow-md",
        ghost: "!text-[var(--ink)] hover:bg-[#eef3f9]",
        danger: "bg-red-700 !text-white hover:bg-red-800 hover:shadow-md [&_svg]:!text-white",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-xl px-3 text-xs",
        lg: "h-12 rounded-xl px-6 text-[15px]",
        xl: "h-14 rounded-2xl px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        suppressHydrationWarning
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
