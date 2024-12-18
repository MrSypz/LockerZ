import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';

interface OptimizedImageProps {
    src: string;
    alt: string;
    width: number;
    height: number;
    quality?: number;
}

export function OptimizedImage({ src, alt, width, height, quality = 80 }: OptimizedImageProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [optimizedSrc, setOptimizedSrc] = useState<string | null>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        invoke('handle_optimize_image_request', {
            src,
            width,
            height,
            quality
        })
            .then((base64Image: string) => {
                setOptimizedSrc(`data:image/webp;base64,${base64Image}`);
                setIsLoaded(true);
                setError(null);
            })
            .catch((err) => {
                console.error('Failed to optimize image:', err);
                setIsLoaded(true);
                setError('Failed to load image');
                setOptimizedSrc(src); // Fallback to original image
            });
    }, [src, width, height, quality]);

    useEffect(() => {
        if (optimizedSrc && imgRef.current) {
            imgRef.current.src = optimizedSrc;
        }
    }, [optimizedSrc]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isLoaded ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full overflow-hidden relative"
        >
            <img
                ref={imgRef}
                alt={alt}
                width={width}
                height={height}
                className="object-cover w-full h-full transition-filter duration-300 ease-out"
                style={{ filter: isLoaded ? 'none' : 'blur(10px)' }}
                loading={"lazy"}
            />
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-100">
                    <span className="text-red-500 text-sm text-center p-4">{error}</span>
                </div>
            )}
        </motion.div>
    );
}
