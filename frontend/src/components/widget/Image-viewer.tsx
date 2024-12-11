import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { X, ZoomIn, ZoomOut, RotateCcw, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from "@/hooks/use-toast";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { File } from "@/types/file";

interface ImageViewerProps {
    files: File[];
    initialIndex: number;
    onClose: () => void;
    getFileUrl: (file: File) => string;
}

export function ImageViewer({ files, initialIndex, onClose, getFileUrl }: ImageViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [scale, setScale] = useState(1);
    const imgRef = useRef<HTMLImageElement>(null);

    const currentFile = files[currentIndex];
    const src = getFileUrl(currentFile);
    const alt = currentFile.name;
    const fileUrl = src;

    const isViewable = ['jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext => src.toLowerCase().endsWith(`.${ext}`));

    const handleViewFullImage = useCallback(() => {
        if (isViewable) {
            window.open(src, '_blank');
        } else {
            toast({
                title: "Unsupported file type",
                description: "This file type cannot be opened in a new tab.",
                variant: "destructive",
            });
        }
    }, [src, isViewable]);

    const handleNavigate = useCallback((direction: 'prev' | 'next') => {
        setCurrentIndex(prevIndex => {
            if (direction === 'prev' && prevIndex > 0) {
                return prevIndex - 1;
            } else if (direction === 'next' && prevIndex < files.length - 1) {
                return prevIndex + 1;
            }
            return prevIndex;
        });
    }, [files.length]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            } else if (event.key === 'ArrowLeft' && currentIndex > 0) {
                handleNavigate('prev');
            } else if (event.key === 'ArrowRight' && currentIndex < files.length - 1) {
                handleNavigate('next');
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose, handleNavigate, currentIndex, files.length]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative w-full h-full max-w-[90vw] max-h-[90vh]">
                <TransformWrapper
                    initialScale={1}
                    initialPositionX={0}
                    initialPositionY={0}
                    centerOnInit={true}
                    minScale={0.1}
                    maxScale={8}
                    onZoom={(ref) => setScale(ref.state.scale)}
                >
                    {({zoomIn, zoomOut, resetTransform}) => (
                        <>
                            <TransformComponent
                                wrapperClass="!w-full !h-full"
                                contentClass="!w-full !h-full flex items-center justify-center"
                            >
                                <ContextMenu>
                                    <ContextMenuTrigger>
                                        <img
                                            ref={imgRef}
                                            src={src}
                                            alt={alt}
                                            className="max-w-full h-screen object-contain"
                                        />
                                    </ContextMenuTrigger>
                                    <ContextMenuContent>
                                        <ContextMenuItem onClick={handleViewFullImage} disabled={!isViewable}>
                                            <ExternalLink className="mr-2 h-4 w-4"/>
                                            View Full Image
                                        </ContextMenuItem>
                                    </ContextMenuContent>
                                </ContextMenu>
                            </TransformComponent>
                            <div className="absolute bottom-4 right-4 flex flex-col items-end space-y-2">
                                <div className="flex items-center space-x-2 bg-background/80 rounded-full p-1">
                                    <Button variant="ghost" size="icon" onClick={() => zoomOut()}>
                                        <ZoomOut className="h-4 w-4"/>
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => zoomIn()}>
                                        <ZoomIn className="h-4 w-4"/>
                                    </Button>
                                </div>
                                <Button variant="secondary" size="sm" onClick={() => resetTransform()}>
                                    <RotateCcw className="h-4 w-4 mr-2"/>
                                    Reset
                                </Button>
                                {fileUrl && (
                                    <div
                                        className="bg-background/80 text-foreground px-2 py-1 rounded-md text-xs max-w-xs truncate">
                                        {fileUrl}
                                    </div>
                                )}
                            </div>
                            <div
                                className="absolute top-4 left-4 bg-background/80 text-foreground px-2 py-1 rounded-full text-sm font-medium">
                                {Math.round(scale * 100)}%
                            </div>
                            <div
                                className="absolute bottom-4 left-4 bg-background/80 text-foreground px-2 py-1 rounded-md text-sm">
                            </div>
                        </>
                    )}
                </TransformWrapper>
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-4 rounded-full bg-background/80 hover:bg-background/100"
                    onClick={onClose}
                >
                    <X className="h-5 w-5"/>
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 rounded-full bg-background/80 hover:bg-background/100"
                    onClick={() => handleNavigate('prev')}
                    disabled={currentIndex === 0}
                >
                    <ChevronLeft className="h-5 w-5"/>
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 rounded-full bg-background/80 hover:bg-background/100"
                    onClick={() => handleNavigate('next')}
                    disabled={currentIndex === files.length - 1}
                >
                    <ChevronRight className="h-5 w-5"/>
                </Button>
            </div>
        </div>
    );
}

