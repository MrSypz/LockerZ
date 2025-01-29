import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface BatchOptimizedImageProps {
    src: string;
    alt: string;
    width: number;
    height: number;
    quality?: number;
    optimizedData?: string | null;
    status: 'queued' | 'processing' | 'loaded' | 'error';
}

export function BatchOptimizedImage({
                                        src,
                                        alt,
                                        width,
                                        height,
                                        optimizedData,
                                        status
                                    }: BatchOptimizedImageProps) {
    // Use the original image if optimization hasn't completed
    const imageUrl = optimizedData ? `data:image/jpeg;base64,${optimizedData}` : src;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="relative w-full h-full"
        >
            {/* Always render the image */}
            <motion.img
                src={imageUrl}
                alt={alt}
                width={width}
                height={height}
                className={`w-full h-full object-cover transition-opacity duration-300 ${status === 'loaded' ? 'opacity-100' : 'opacity-70'}`}
                initial={{ filter: 'blur(10px)' }}
                animate={{
                    filter: status === 'loaded' ? 'blur(0px)' : 'blur(10px)',
                }}
                transition={{ duration: 0.5 }}
                loading="lazy"
            />

            {/* Overlay states */}
            {status === 'processing' && (
                <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-10">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            )}

            {status === 'queued' && (
                <div className="absolute inset-0 bg-gray-900/30 flex items-center justify-center z-10">
                    <span className="text-sm text-white">Queued</span>
                </div>
            )}

            {status === 'error' && (
                <div className="absolute inset-0 bg-red-500/10 backdrop-blur-sm flex items-center justify-center z-10">
                    <span className="text-sm text-red-500">Failed to optimize</span>
                </div>
            )}
        </motion.div>
    );
}