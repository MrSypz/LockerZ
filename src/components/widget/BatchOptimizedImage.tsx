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

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
};

const loadingVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.3 }
    },
    exit: {
        opacity: 0,
        scale: 0.9,
        transition: { duration: 0.2 }
    }
};

const imageVariants = {
    hidden: { filter: "blur(10px)", opacity: 0 },
    visible: {
        filter: "blur(0px)",
        opacity: 1,
        transition: { duration: 0.5, delay: 0.2 }
    }
};

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
    const [hasStartedLoading, setHasStartedLoading] = useState(false);

    useEffect(() => {
        if (status === "queued" || status === "processing") {
            setHasStartedLoading(true);
        }

        if (status === "loaded") {
            setShowSuccess(true);
            const timer = setTimeout(() => setShowSuccess(false), 1500);
            return () => clearTimeout(timer);
        }
    }, [status]);

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="relative w-full h-full bg-gray-900 overflow-hidden"
        >
            {/* Loading States */}
            <AnimatePresence>
                {(status === "processing" || status === "queued") && hasStartedLoading && (
                    <motion.div
                        variants={loadingVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="absolute inset-0 flex flex-col items-center justify-center"
                    >
                        <motion.div
                            className="relative"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                            <div className="w-12 h-12 rounded-full border-4 border-gray-700 border-t-indigo-500" />
                            <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-indigo-500 opacity-20" />
                        </motion.div>
                        <motion.span
                            className="mt-4 text-gray-400 text-sm"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            {status === "queued" ? "Waiting to optimize..." : "Optimizing..."}
                        </motion.span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Image */}
            <motion.img
                src={imageUrl}
                alt={alt}
                width={width}
                height={height}
                className="w-full h-full object-cover"
                variants={imageVariants}
                initial="hidden"
                animate={status === "loaded" ? "visible" : "hidden"}
                loading="lazy"
            />

            {/* Error State */}
            <AnimatePresence>
                {status === "error" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
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
            </AnimatePresence>

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