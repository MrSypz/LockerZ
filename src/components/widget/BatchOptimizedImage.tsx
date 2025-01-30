import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BatchOptimizedImageProps {
    src: string;
    alt: string;
    width: number;
    height: number;
    quality?: number;
    optimizedData?: string | null;
    status: "queued" | "processing" | "loaded" | "error";
    onRetry?: () => void;
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
    const imageUrl = optimizedData ? `data:image/webp;base64,${optimizedData}` : src;
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        if (status === "loaded") {
            setShowSuccess(true);
            const timer = setTimeout(() => setShowSuccess(false), 1500);
            return () => clearTimeout(timer);
        }
    }, [status]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="relative w-full h-full"
        >
            {/* Loading States */}
            {(status === "processing" || status === "queued") && (
                <div className="absolute inset-0 bg-gray-900">
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full border-4 border-gray-700 border-t-indigo-500 animate-spin" />
                            <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-indigo-500 opacity-20" />
                        </div>
                        <span className="mt-4 text-gray-400 text-sm">
                            {status === "queued" ? "Waiting to optimize..." : "Optimizing..."}
                        </span>
                    </div>
                </div>
            )}

            {/* Main Image */}
            <motion.img
                src={imageUrl}
                alt={alt}
                width={width}
                height={height}
                className="w-full h-full object-cover"
                initial={{ filter: "blur(10px)", opacity: 0 }}
                animate={{
                    filter: status === "loaded" ? "blur(0px)" : "blur(10px)",
                    opacity: status === "loaded" ? 1 : 0,
                }}
                transition={{ duration: 0.5 }}
                loading="lazy"
            />

            {/* Error State */}
            {status === "error" && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-red-50"
                >
                    <div className="bg-white p-4 rounded-lg shadow-lg">
                        <p className="text-red-500 text-sm">Failed to optimize image</p>
                        {onRetry && (
                            <button
                                onClick={onRetry}
                                className="mt-2 text-xs text-blue-500 hover:text-blue-600"
                            >
                                Retry
                            </button>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Success Message */}
            <AnimatePresence>
                {showSuccess && status === "loaded" && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.3 }}
                        className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/50 to-transparent"
                    >
                        <p className="text-white text-sm text-center">Optimization complete!</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}