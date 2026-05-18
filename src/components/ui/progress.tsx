"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
    React.ElementRef<typeof ProgressPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
    <ProgressPrimitive.Root
        ref={ref}
        className={cn(
            "relative h-2 w-full overflow-hidden rounded-full bg-blue-100",
            className
        )}
        {...props}
    >
        <ProgressPrimitive.Indicator asChild>
            <motion.div
                className="h-full w-full flex-1 bg-blue-500 transition-all"
                style={{ transformOrigin: "0%" }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: value ? value / 100 : 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
            />
        </ProgressPrimitive.Indicator>
    </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }

