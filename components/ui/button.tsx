import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "rounded-xl bg-[rgba(10,132,255,0.18)] border border-[rgba(10,132,255,0.30)] text-[#0a84ff] hover:bg-[rgba(10,132,255,0.25)]",
        destructive:
          "rounded-xl bg-[rgba(255,69,58,0.15)] border border-[rgba(255,69,58,0.30)] text-[#ff453a] hover:bg-[rgba(255,69,58,0.22)]",
        outline:
          "rounded-xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.85)] hover:box-shadow-[0_0_20px_rgba(255,255,255,0.05)]",
        secondary:
          "rounded-xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.60)] hover:bg-[rgba(255,255,255,0.09)]",
        ghost:
          "rounded-xl text-[rgba(255,255,255,0.60)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[rgba(255,255,255,0.85)]",
        link: "text-[#0a84ff] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-lg px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 rounded-xl gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-xl px-6 has-[>svg]:px-4",
        icon: "size-9 rounded-xl",
        "icon-xs": "size-6 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-xl",
        "icon-lg": "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
