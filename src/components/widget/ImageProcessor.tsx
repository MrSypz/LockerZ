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
        setIsLoaded(false);
        invoke('handle_optimize_image_request', {
            src,
            width,
            height,
            quality,
        })
            .then((base64Image) => {
                setOptimizedSrc(`data:image/webp;base64,${base64Image}`);
                setIsLoaded(true);
            })
            .catch((err) => {
                console.error('Failed to optimize image:', err);
                setError('Failed to load image');
                setOptimizedSrc(src);
                setIsLoaded(true);
            });
    }, [src, width, height, quality]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="relative w-full h-full"
        >
            {!isLoaded && (
                <div className="absolute inset-0 bg-gray-900">
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full border-4 border-gray-700 border-t-indigo-500 animate-spin" />
                            <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-indigo-500 opacity-20" />
                        </div>
                        <span className="mt-4 text-gray-400 text-sm">I'm still Optimize...</span>
                    </div>
                </div>
            )}

            <motion.img
                ref={imgRef}
                src={optimizedSrc as string}
                alt={alt}
                width={width}
                height={height}
                className="w-full h-full object-cover"
                initial={{filter: 'blur(10px)', opacity: 0}}
                animate={{
                    filter: isLoaded ? 'blur(0px)' : 'blur(10px)',
                    opacity: isLoaded ? 1 : 0
                }}
                transition={{duration: 0.5}}
                loading="lazy"
            />

            {error && (
                <motion.div
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    className="absolute inset-0 flex items-center justify-center bg-red-50"
                >
                    <div className="bg-white p-4 rounded-lg shadow-lg">
                        <p className="text-red-500 text-sm">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-2 text-xs text-blue-500 hover:text-blue-600"
                        >
                            Retry
                        </button>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}