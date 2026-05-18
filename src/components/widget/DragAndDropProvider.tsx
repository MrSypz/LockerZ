import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentWindow } from "@tauri-apps/api/window";

interface DragAndDropContextType {
    isDragActive: boolean;
    handleDragOver: (e: React.DragEvent) => void;
    handleDragLeave: () => void;
    handleDrop: (e: React.DragEvent) => void;
}

const DragAndDropContext = createContext<DragAndDropContextType | undefined>(undefined);

interface DragAndDropProviderProps {
    children: React.ReactNode;
    onFilesDrop: (files: string[]) => Promise<void>;
}

export function DragAndDropProvider({ children, onFilesDrop }: DragAndDropProviderProps) {
    const [isDragActive, setIsDragActive] = useState(false);

    useEffect(() => {
        let isMounted = true;
        let unlistenFunction: (() => void) | undefined;

        const setupDragDropListener = async () => {
            if (!isMounted) return;

            unlistenFunction = await getCurrentWindow().onDragDropEvent((event) => {
                if (!isMounted) return;

                switch (event.payload.type) {
                    case 'over':
                        setIsDragActive(true);
                        break;
                    case 'drop':
                        setIsDragActive(false);
                        if (event.payload.paths) {
                            onFilesDrop(event.payload.paths);
                        }
                        break;
                    default:
                        setIsDragActive(false);
                }
            });
        };

        setupDragDropListener();

        return () => {
            isMounted = false;
            if (unlistenFunction) {
                unlistenFunction();
            }
        };
    }, [onFilesDrop]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(true);
    };

    const handleDragLeave = () => {
        setIsDragActive(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);
    };

    return (
        <DragAndDropContext.Provider
            value={{
                isDragActive,
                handleDragOver,
                handleDragLeave,
                handleDrop,
            }}
        >
            {children}
        </DragAndDropContext.Provider>
    );
}

export function useDragAndDrop() {
    const context = useContext(DragAndDropContext);
    if (context === undefined) {
        throw new Error('useDragAndDrop must be used within a DragAndDropProvider');
    }
    return context;
}