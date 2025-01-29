import React, { useState, useEffect } from 'react';
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
    const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
    const [optimizedSrc, setOptimizedSrc] = useState<string>(src);

    useEffect(() => {
        setImageStatus('loading');

        invoke('handle_optimize_image_request', { src, width, height, quality })
            .then((base64Image) => {
                setOptimizedSrc(`data:image/webp;base64,${base64Image}`);
                setImageStatus('loaded');
            })
            .catch((err) => {
                console.error('Image optimization failed:', err);
                setImageStatus('error');
            });
    }, [src, width, height, quality]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="relative w-full h-full"
        >
            {imageStatus === 'loading' && (
                <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full border-4 border-gray-700 border-t-indigo-500 animate-spin"></div>
                        <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-indigo-500 opacity-20"></div>
                    </div>
                    <span className="mt-4 text-gray-400 text-sm">Optimizing...</span>
                </div>
            )}

            {imageStatus !== 'error' ? (
                <motion.img
                    src={optimizedSrc}
                    alt={alt}
                    width={width}
                    height={height}
                    className="w-full h-full object-cover"
                    initial={{ filter: 'blur(10px)', opacity: 0 }}
                    animate={{
                        filter: imageStatus === 'loaded' ? 'blur(0px)' : 'blur(10px)',
                        opacity: imageStatus === 'loaded' ? 1 : 0,
                    }}
                    transition={{ duration: 0.5 }}
                    loading="lazy"
                />
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-red-50"
                >
                    <div className="bg-white p-4 rounded-lg shadow-lg">
                        <p className="text-red-500 text-sm">Failed to load image</p>
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
