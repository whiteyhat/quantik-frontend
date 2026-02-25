import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-xl border px-3 py-1 text-sm transition-[color,box-shadow] outline-none",
        "bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.85)]",
        "placeholder:text-[rgba(255,255,255,0.30)]",
        "focus-visible:border-[#0a84ff] focus-visible:ring-2 focus-visible:ring-[rgba(0,122,255,0.25)]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "file:text-[rgba(255,255,255,0.85)] file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "backdrop-blur-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
