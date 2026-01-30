import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // TurboTax Input Styles - 모바일 퍼스트
          "flex w-full rounded-input border border-neutral-400 bg-white px-4 py-3 text-base text-neutral-900 transition-all duration-200",
          // 모바일: 48px, 데스크톱: 44px
          "h-12 md:h-11",
          // Focus 상태
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-500/10 focus-visible:border-primary-500",
          // Placeholder
          "placeholder:text-neutral-500",
          // File input
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-neutral-900",
          // Disabled 상태
          "disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-neutral-100",
          // Hover 상태 (데스크톱만)
          "hover:border-neutral-500",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
