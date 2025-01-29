import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface BatchProcessingState {
    optimizedImages: Map<string, string>;
    imageStatus: Map<string, 'queued' | 'processing' | 'loaded' | 'error'>;
    isProcessing: boolean;
}

interface BatchProcessingContextValue extends BatchProcessingState {
    updateOptimizedImages: (images: Map<string, string>) => void;
    updateImageStatus: (status: Map<string, 'queued' | 'processing' | 'loaded' | 'error'>) => void;
    optimizeImages: (images: { filepath: string }[], width: number, height: number, quality: number) => Promise<void>;
    reset: () => void;
}

const BatchProcessingContext = createContext<BatchProcessingContextValue | null>(null);

const BATCH_SIZE = 32; // Process 32 images at a time

export function BatchProcessingProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<BatchProcessingState>({
        optimizedImages: new Map(),
        imageStatus: new Map(),
        isProcessing: false,
    });

    const updateOptimizedImages = useCallback((images: Map<string, string>) => {
        setState(prev => ({
            ...prev,
            optimizedImages: new Map([...prev.optimizedImages, ...images])
        }));
    }, []);

    const updateImageStatus = useCallback((status: Map<string, 'queued' | 'processing' | 'loaded' | 'error'>) => {
        setState(prev => ({
            ...prev,
            imageStatus: new Map([...prev.imageStatus, ...status])
        }));
    }, []);

    const optimizeImages = useCallback(async (
        images: { filepath: string }[],
        width: number,
        height: number,
        quality: number
    ) => {
        // Process images in batches
        for (let i = 0; i < images.length; i += BATCH_SIZE) {
            const batch = images.slice(i, i + BATCH_SIZE);

            // Mark current batch as processing
            const processingStatus = new Map(
                batch.map(img => [img.filepath, 'processing' as const])
            );
            updateImageStatus(processingStatus);

            try {
                const results = await invoke('batch_optimize_images', {
                    request: {
                        paths: batch.map(img => img.filepath),
                        width,
                        height,
                        quality
                    }
                }) as Array<{
                    path: string;
                    data?: string;
                    error?: string;
                }>;

                // Update results
                const optimizedMap = new Map();
                const statusMap = new Map();

                results.forEach(result => {
                    if (result.data) {
                        optimizedMap.set(result.path, result.data);
                        statusMap.set(result.path, 'loaded');
                    } else {
                        statusMap.set(result.path, 'error');
                    }
                });

                updateOptimizedImages(optimizedMap);
                updateImageStatus(statusMap);

            } catch (error) {
                console.error('Batch processing failed:', error);
                const errorStatus = new Map(
                    batch.map(img => [img.filepath, 'error' as const])
                );
                updateImageStatus(errorStatus);
            }
        }
    }, [updateOptimizedImages, updateImageStatus]);

    const reset = useCallback(() => {
        setState({
            optimizedImages: new Map(),
            imageStatus: new Map(),
            isProcessing: false,
        });
    }, []);

    return (
        <BatchProcessingContext.Provider
            value={{
                ...state,
                updateOptimizedImages,
                updateImageStatus,
                optimizeImages,
                reset,
            }}
        >
            {children}
        </BatchProcessingContext.Provider>
    );
}

export const useBatchProcessing = () => {
    const context = useContext(BatchProcessingContext);
    if (!context) {
        throw new Error('useBatchProcessing must be used within a BatchProcessingProvider');
    }
    return context;
};