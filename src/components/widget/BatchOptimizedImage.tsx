
import { useState, useEffect } from "react"

interface BatchOptimizedImageProps {
    src: string
    alt: string
    width: number
    height: number
    quality?: number
    optimizedData?: string | null
    status: "queued" | "processing" | "loaded" | "error"
}

export default function BatchOptimizedImage({
    src,
    alt,
    width,
    height,
    optimizedData,
    status,
}: BatchOptimizedImageProps) {
    const imageUrl = optimizedData ? `data:image/webp;base64,${optimizedData}` : src
    const [hasStartedLoading, setHasStartedLoading] = useState(false)

    useEffect(() => {
        if (status === "queued" || status === "processing") {
            setHasStartedLoading(true)
        }
    }, [status])

    return (
        <div className="relative w-full h-full bg-gray-900 overflow-hidden">
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

            {status === "error" && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-50">
                    <p className="text-red-500 text-sm">Failed to optimize image</p>
                </div>
            )}
        </div>
    )
}
