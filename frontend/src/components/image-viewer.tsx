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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
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
                    {({ zoomIn, zoomOut, resetTransform }) => (
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
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                                <Button variant="secondary" size="icon" onClick={() => zoomIn()}>
                                    <ZoomIn className="h-4 w-4" />
                                </Button>
                                <Button variant="secondary" size="icon" onClick={() => zoomOut()}>
                                    <ZoomOut className="h-4 w-4" />
                                </Button>
                                <Button variant="secondary" size="icon" onClick={() => resetTransform()}>
                                    <RotateCcw className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                                {Math.round(scale * 100)}%
                            </div>
                        </>
                    )}
                </TransformWrapper>
                <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-4 right-4"
                    onClick={onClose}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

