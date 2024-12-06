import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { X, ZoomIn, ZoomOut, RotateCcw, ExternalLink, Copy, Check } from 'lucide-react';
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
    file: File;
    src: string;
    alt: string;
    onClose: () => void;
    fileUrl: string;
}

export function ImageViewer({ file, src, alt, onClose, fileUrl }: ImageViewerProps) {
    const [scale, setScale] = useState(1);
    const imgRef = useRef<HTMLImageElement>(null);

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

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose, file]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative w-screen h-screen bg-background/10 overflow-hidden">
                <TransformWrapper
                    initialScale={1}
                    initialPositionX={0}
                    initialPositionY={0}
                    centerOnInit={true}
                    minScale={0.1}
                    maxScale={8}
                    onZoom={(ref) => setScale(ref.state.scale)}
                >
                    {({ zoomIn, zoomOut, resetTransform }) => (
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
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            View Full Image
                                        </ContextMenuItem>
                                    </ContextMenuContent>
                                </ContextMenu>
                            </TransformComponent>
                            <div className="absolute bottom-4 right-4 flex flex-col items-end space-y-2">
                                <div className="flex items-center space-x-2 bg-background/80 rounded-full p-1">
                                    <Button variant="ghost" size="icon" onClick={() => zoomOut()}>
                                        <ZoomOut className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => zoomIn()}>
                                        <ZoomIn className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Button variant="secondary" size="sm" onClick={() => resetTransform()}>
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Reset
                                </Button>
                                {fileUrl && (
                                    <div className="bg-background/80 text-foreground px-2 py-1 rounded-md text-xs max-w-xs truncate">
                                        {fileUrl}
                                    </div>
                                )}
                            </div>
                            <div className="absolute top-4 left-4 bg-background/80 text-foreground px-2 py-1 rounded-full text-sm font-medium">
                                {Math.round(scale * 100)}%
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
                    <X className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}

