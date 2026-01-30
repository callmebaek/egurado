import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // TurboTax Base Styles - 모바일 퍼스트
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-button font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // TurboTax Primary Button
        default:
          "bg-primary-500 text-white shadow-button hover:bg-primary-600 hover:shadow-button-hover active:bg-primary-700 active:scale-95",
        // Destructive/Danger Button
        destructive:
          "bg-error text-white shadow-button hover:bg-[#D32F2F] hover:shadow-button-hover active:scale-95",
        // Outline Button
        outline:
          "border-2 border-primary-500 bg-white text-primary-500 hover:bg-neutral-100 active:scale-95",
        // Secondary Button
        secondary:
          "bg-neutral-100 text-neutral-900 hover:bg-neutral-200 active:scale-95",
        // Ghost Button
        ghost: 
          "bg-transparent text-primary-500 hover:bg-neutral-100 active:scale-95",
        // Link Button
        link: 
          "text-primary-500 underline-offset-4 hover:underline",
      },
      size: {
        // 모바일: 48px, 데스크톱: 44px
        default: "h-12 md:h-11 px-6 text-base",
        // 모바일: 40px, 데스크톱: 36px
        sm: "h-10 md:h-9 px-4 text-sm",
        // 큰 버튼
        lg: "h-12 md:h-13 px-8 text-lg",
        // 아이콘 버튼 (정사각형)
        icon: "h-12 w-12 md:h-11 md:w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
