import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all duration-[var(--transition-fast)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--primary)] text-white shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]",
        secondary:
          "border-transparent bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--olive-200)]",
        destructive:
          "border-transparent bg-red-600 text-white shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]",
        outline: "text-[var(--foreground)] border-[var(--border)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
