import React from 'react'
import { cn } from "@/lib/utils"
import { useTranslation } from 'react-i18next'

type PerformanceImpact = 'veryhigh'| 'high' | 'medium' | 'low'

interface PerformanceImpactProps {
    impact: PerformanceImpact
}

const impactColors: Record<PerformanceImpact, string> = {
    veryhigh: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500'
}

export function PerformanceImpact({ impact }: PerformanceImpactProps) {
    const { t } = useTranslation()

    return (
        <div className="flex items-center space-x-2">
            <div className={cn("w-3 h-3 rounded-full", impactColors[impact])} />
            <span className="text-sm text-muted-foreground">
        {t(`settings.performanceImpact.${impact}`)}
      </span>
        </div>
    )
}

