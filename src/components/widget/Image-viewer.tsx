import React, { useCallback, useEffect, useState } from 'react';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import {
    ChevronLeft,
    ChevronRight,
    Move,
    RotateCcw,
    X,
    ZoomIn,
    ZoomOut,
    Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger
} from "@/components/ui/context-menu";
import { File } from "@/types/file";
import {convertFileSrc} from "@tauri-apps/api/core";
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { toast } from "@/hooks/use-toast";
interface ImageViewerProps {
    files: File[];
    initialIndex: number;
    onClose: () => void;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    imagesPerPage: number;
}

export function ImageViewer({
                                files,
                                initialIndex,
                                onClose,
                                currentPage,
                                totalPages,
                                onPageChange,
                                imagesPerPage
                            }: ImageViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [scale, setScale] = useState(1);
    const [isPanning, setIsPanning] = useState(false);
    const currentFile = files[currentIndex];
    const src = convertFileSrc(currentFile.filepath);
    const alt = currentFile.name;

    const handleNavigate = useCallback((direction: 'prev' | 'next') => {
        if (direction === 'next') {
            if (currentIndex < files.length - 1) {
                setCurrentIndex(currentIndex + 1);
            } else if (currentPage < totalPages) {
                onPageChange(currentPage + 1);
                setCurrentIndex(0);
            }
        } else {
            if (currentIndex > 0) {
                setCurrentIndex(currentIndex - 1);
            } else if (currentPage > 1) {
                onPageChange(currentPage - 1);
                setCurrentIndex(imagesPerPage - 1);
            }
        }
    }, [currentIndex, files.length, currentPage, totalPages, onPageChange, imagesPerPage]);

    const handleCopyPath = async () => {
        try {
            await writeText(currentFile.filepath);
            toast({
                description: "Path copied to clipboard",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to copy path",
                variant: "destructive"
            });
        }
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            } else if (event.key === 'a') {
                handleNavigate('prev');
            } else if (event.key === 'd') {
                handleNavigate('next');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, handleNavigate]);

    return (
        <div className="fixed inset-0 -top-[16px] z-50 bg-black/80 backdrop-blur-sm p-0 m-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden p-0 m-0">
                <TransformWrapper
                    initialScale={1}
                    initialPositionX={0}
                    initialPositionY={0}
                    centerOnInit={true}
                    minScale={0.1}
                    maxScale={8}
                    onZoom={(ref) => setScale(ref.state.scale)}
                    onPanning={() => setIsPanning(true)}
                    onPanningStop={() => setIsPanning(false)}
                    wheel={{ disabled: false }}
                    alignmentAnimation={{ disabled: true }}
                    panning={{ disabled: false }}
                    doubleClick={{ disabled: false }}
                >
                    {({ zoomIn, zoomOut, resetTransform, setTransform }) => (
                        <>
                            <TransformComponent
                                wrapperClass="!w-screen !h-screen !overflow-hidden"
                                contentClass="!w-full !h-full !flex !items-center !justify-center"
                            >
                                <ContextMenu>
                                    <ContextMenuTrigger>
                                        <img
                                            src={src}
                                            alt={alt}
                                            className="w-auto h-auto max-w-none object-contain"
                                            style={{ maxHeight: '100vh', maxWidth: '100vw' }}
                                        />
                                    </ContextMenuTrigger>
                                    <ContextMenuContent className="w-64">
                                        <ContextMenuItem
                                            onClick={handleCopyPath}
                                            className="flex items-center cursor-pointer"
                                        >
                                            <Copy className="mr-2 h-4 w-4" />
                                            Copy File Path
                                        </ContextMenuItem>
                                    </ContextMenuContent>
                                </ContextMenu>
                            </TransformComponent>

                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 glass-effect rounded-full p-1">
                                <Button variant="ghost" size="icon" onClick={() => zoomOut()}>
                                    <ZoomOut className="h-4 w-4"/>
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => zoomIn()}>
                                    <ZoomIn className="h-4 w-4"/>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setTransform(0, 0, 1, 200)}
                                    className={isPanning ? 'bg-primary text-primary-foreground' : ''}
                                >
                                    <Move className="h-4 w-4"/>
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => resetTransform()}>
                                    <RotateCcw className="h-4 w-4"/>
                                </Button>
                            </div>

                            <div className="absolute top-4 left-4 glass-effect px-2 py-1 rounded-full text-sm font-medium">
                                {Math.round(scale * 100)}%
                            </div>
                        </>
                    )}
                </TransformWrapper>

                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-4 rounded-full glass-effect hover:bg-background/100"
                    onClick={onClose}
                >
                    <X className="h-5 w-5"/>
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 rounded-full glass-effect hover:bg-background/100"
                    onClick={() => handleNavigate('prev')}
                    disabled={currentIndex === 0 && currentPage === 1}
                >
                    <ChevronLeft className="h-5 w-5"/>
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 rounded-full glass-effect hover:bg-background/100"
                    onClick={() => handleNavigate('next')}
                    disabled={currentIndex === files.length - 1 && currentPage === totalPages}
                >
                    <ChevronRight className="h-5 w-5"/>
                </Button>
            </div>

            {currentFile.filepath && (
                <div className="absolute bottom-16 left-4 glass-effect px-2 py-1 rounded-md text-xs max-w-xs truncate">
                    {currentFile.filepath}
                </div>
            )}

            <div className="absolute bottom-16 right-4 glass-effect px-2 py-1 rounded-md text-xs">
                Image {currentIndex + 1} of {files.length} (Page {currentPage} of {totalPages})
            </div>
        </div>
    );
}