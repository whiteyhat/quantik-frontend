import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 transition-colors overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-[rgba(10,132,255,0.15)] border border-[rgba(10,132,255,0.30)] text-[#0a84ff]",
        secondary:
          "bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.60)]",
        destructive:
          "bg-[rgba(255,69,58,0.15)] border border-[rgba(255,69,58,0.30)] text-[#ff453a]",
        outline:
          "bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.85)]",
        ghost:
          "bg-transparent text-[rgba(255,255,255,0.60)]",
        link: "text-[#0a84ff] underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
