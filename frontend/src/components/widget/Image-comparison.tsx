"use client"

import { useState } from 'react'
import Image from 'next/image'
import { Slider } from "@/components/ui/slider"

interface ImageComparisonProps {
    beforeSrc: string
    afterSrc: string
    beforeAlt?: string
    afterAlt?: string
}

export function ImageComparison({ beforeSrc, afterSrc, beforeAlt = "Before", afterAlt = "After" }: ImageComparisonProps) {
    const [sliderPosition, setSliderPosition] = useState(50)

    return (
        <div className="relative w-full aspect-video">
            <div className="absolute inset-0">
                <Image
                    src={afterSrc}
                    alt={afterAlt}
                    fill
                    className="object-cover"
                />
            </div>
            <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
            >
                <Image
                    src={beforeSrc}
                    alt={beforeAlt}
                    fill
                    className="object-cover"
                />
            </div>
            <div className="absolute inset-x-0 bottom-4 px-4">
                <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[sliderPosition]}
                    onValueChange={(value) => setSliderPosition(value[0])}
                    className="z-10"
                />
            </div>
        </div>
    )
}

