import React from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Upload } from 'lucide-react';
import { useDragAndDrop } from './DragAndDropProvider';
import { cn } from "@/lib/utils";

interface DragDropZoneProps {
    children: React.ReactNode;
    className?: string;
    hasContent?: boolean;
}

export function DragDropZone({
                                 children,
                                 className,
                                 hasContent = false
                             }: DragDropZoneProps) {
    const { isDragActive, handleDragOver, handleDragLeave, handleDrop } = useDragAndDrop();

    return (
        <motion.div
            layout
            className={cn(
                "relative min-h-[300px] transition-colors duration-300",
                isDragActive
                    ? 'bg-primary/5 border-2 border-dashed border-primary ring-4 ring-primary/10'
                    : 'bg-background/50 backdrop-blur-sm border border-border',
                className
            )}
            animate={{
                scale: isDragActive ? 0.99 : 1,
            }}
            transition={{ duration: 0.2 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <AnimatePresence>
                {isDragActive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 rounded-lg z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    >
                        {!hasContent && (
                            <motion.div
                                className="text-center p-8 rounded-xl"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Upload className="h-16 w-16 mx-auto mb-4 text-primary animate-bounce" />
                                <p className="text-xl font-semibold text-primary mb-2">
                                    Drop images here
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Release to upload your files
                                </p>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
            {children}
        </motion.div>
    );
}