import { cn } from "@/lib/utils"
import type { ButtonHTMLAttributes } from "react"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost"
  size?: "default" | "icon" | "sm"
}

export function Button({ className, variant = "default", size = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "ghost"   && "hover:bg-accent hover:text-accent-foreground",
        size === "default" && "h-9 px-4 py-2 text-sm",
        size === "sm"      && "h-8 px-3 text-xs",
        size === "icon"    && "h-9 w-9",
        className,
      )}
      {...props}
    />
  )
}
