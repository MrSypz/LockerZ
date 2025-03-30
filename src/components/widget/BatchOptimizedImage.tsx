"use client"

import { useState, useEffect } from "react"

interface BatchOptimizedImageProps {
    src: string
    alt: string
    width: number
    height: number
    quality?: number
    optimizedData?: string | null
    status: "queued" | "processing" | "loaded" | "error"
    onRetry?: () => void
}

export default function BatchOptimizedImage({
                                                src,
                                                alt,
                                                width,
                                                height,
                                                optimizedData,
                                                status,
                                                onRetry,
                                            }: BatchOptimizedImageProps) {
    const imageUrl = optimizedData ? `data:image/webp;base64,${optimizedData}` : src
    const [showSuccess, setShowSuccess] = useState(false)
    const [hasStartedLoading, setHasStartedLoading] = useState(false)

    useEffect(() => {
        if (status === "queued" || status === "processing") {
            setHasStartedLoading(true)
        }

        if (status === "loaded") {
            setShowSuccess(true)
            const timer = setTimeout(() => setShowSuccess(false), 1500)
            return () => clearTimeout(timer)
        }
    }, [status])

    return (
        <div className="relative w-full h-full bg-gray-900 overflow-hidden">
            {/* Loading States */}
            {(status === "processing" || status === "queued") && hasStartedLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full border-4 border-gray-700 border-t-indigo-500 animate-spin" />
                        <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-indigo-500 opacity-20" />
                    </div>
                    <span className="mt-4 text-gray-400 text-sm">
            {status === "queued" ? "Waiting to optimize..." : "Optimizing..."}
          </span>
                </div>
            )}

            {/* Main Image */}
            {status !== "error" && (
                <img
                    src={imageUrl || "/placeholder.svg"}
                    alt={alt}
                    width={width}
                    height={height}
                    className="w-full h-full object-cover transition-opacity duration-300"
                    style={{ opacity: status === "loaded" ? 1 : 0 }}
                    loading="lazy"
                />
            )}

            {/* Error State */}
            {status === "error" && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-50">
                    <div className="bg-white p-4 rounded-lg shadow-lg">
                        <p className="text-red-500 text-sm">Failed to optimize image</p>
                        {onRetry && (
                            <button onClick={onRetry} className="mt-2 text-xs text-blue-500 hover:text-blue-600">
                                Retry
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Success Message */}
            {showSuccess && status === "loaded" && (
                <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/50 to-transparent">
                    <p className="text-white text-sm text-center">Optimization complete!</p>
                </div>
            )}
        </div>
    )
}

