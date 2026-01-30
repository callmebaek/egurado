import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // TurboTax Badge Base Styles
  "inline-flex items-center rounded-xl border px-3 py-1 text-xs font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Primary Badge
        default:
          "border-transparent bg-primary-100 text-primary-500",
        // Secondary Badge
        secondary:
          "border-transparent bg-neutral-100 text-neutral-700",
        // Success Badge
        success:
          "border-transparent bg-success-bg text-success",
        // Warning Badge
        warning:
          "border-transparent bg-warning-bg text-warning",
        // Error Badge
        destructive:
          "border-transparent bg-error-bg text-error",
        // Info Badge
        info:
          "border-transparent bg-info-bg text-info",
        // Outline Badge
        outline: 
          "text-neutral-700 border-neutral-300 bg-white",
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
