import React, { useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageViewerProps {
    src: string;
    alt: string;
    onClose: () => void;
}

export function ImageViewer({ src, alt, onClose }: ImageViewerProps) {
    const [scale, setScale] = useState(1);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative w-full h-full max-w-[90vw] max-h-[90vh] bg-background/10 rounded-lg overflow-hidden shadow-lg">
                <TransformWrapper
                    initialScale={1}
                    initialPositionX={0}
                    initialPositionY={0}
                    centerOnInit={true}
                    minScale={0.1}
                    maxScale={8}
                    onZoom={(ref) => setScale(ref.state.scale)}
                >
                    {({ zoomIn, zoomOut, resetTransform, setTransform }) => (
                        <>
                            <TransformComponent
                                wrapperClass="!w-full !h-full"
                                contentClass="!w-full !h-full flex items-center justify-center"
                            >
                                <img
                                    src={src}
                                    alt={alt}
                                    className="max-w-full max-h-full object-contain"
                                />
                            </TransformComponent>
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center space-y-2">
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

