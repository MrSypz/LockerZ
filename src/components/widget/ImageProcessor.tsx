
import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"

interface OptimizedImageProps {
    src: string
    alt: string
    width: number
    height: number
    quality?: number
    onLoad?: () => void
    className?: string
}

export function OptimizedImage({ src, alt, width, height, quality = 80, onLoad, className }: OptimizedImageProps) {
    const [optimizedSrc, setOptimizedSrc] = useState<string>(src)
    const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading")

    useEffect(() => {
        setStatus("loading")

        invoke("handle_optimize_image_request", { src, width, height, quality })
            .then((base64Image) => {
                setOptimizedSrc(`data:image/webp;base64,${base64Image}`)
                setStatus("loaded")
                if (onLoad) onLoad()
            })
            .catch((err) => {
                console.error("Image optimization failed:", err)
                setStatus("error")
            })
    }, [src, width, height, quality, onLoad])

    if (status === "error") {
        return (
            <div className="flex items-center justify-center w-full h-full bg-red-50">
                <p className="text-red-500 text-sm">Failed to load image</p>
            </div>
        )
    }

    return (
        <img
            src={optimizedSrc || "/placeholder.svg"}
            alt={alt}
            width={width}
            height={height}
            className={className}
            loading="lazy"
            onLoad={() => status === "loading" && setStatus("loaded")}
        />
    )
}

