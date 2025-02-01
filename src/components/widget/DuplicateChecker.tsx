import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Loader2, Image as ImageIcon, ChevronLeft, ChevronRight, FolderOpen, Trash, Settings2 } from 'lucide-react';
import { OptimizedImage } from '@/components/widget/ImageProcessor';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import DuplicateProgress from '@/components/widget/DuplicateProgress';

interface ImageInfo {
    path: string;
    category: string;
    similarity?: number;
}

interface DuplicateGroup {
    path: string;
    category: string;
    duplicates: ImageInfo[];
}

const ImageResolutions = {
    "720p": { width: 1280, height: 720 },
    "1080p": { width: 1920, height: 1080 },
    "2k": { width: 2560, height: 1440 },
    "4k": { width: 3840, height: 2160 }
};

const ImageCard: React.FC<{
    src: string;
    alt: string;
    info: ImageInfo;
    resolution: keyof typeof ImageResolutions;
    onConfirmDelete: (category: string, path: string) => void;
}> = ({ src, alt, info, resolution, onConfirmDelete }) => {
    const handleShowInFolder = async (path: string) => {
        try {
            await invoke('show_in_folder', { path });
        } catch (error) {
            console.error('Error opening folder:', error);
        }
    };

    const handleShowInPhotos = async (path: string) => {
        try {
            await invoke('show_in_photos', { path });
        } catch (error) {
            console.error('Error opening image in Photos app:', error);
        }
    };

    return (
        <div className="relative flex flex-col border rounded-lg overflow-hidden bg-card">
            <div
                className="aspect-square w-full relative cursor-pointer overflow-hidden"
                onClick={() => handleShowInPhotos(info.path)}
            >
                <OptimizedImage
                    src={src}
                    alt={alt}
                    width={ImageResolutions[resolution].width}
                    height={ImageResolutions[resolution].height}
                />
            </div>
            <div className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                    <p className="text-sm font-medium truncate flex-1" title={info.path}>
                        {info.path.split('/').pop()}
                    </p>
                    <div className="flex gap-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleShowInFolder(info.path)}
                                >
                                    <FolderOpen className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Show in folder</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => onConfirmDelete(info.category, info.path)}
                                >
                                    <Trash className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete Image</TooltipContent>
                        </Tooltip>
                    </div>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{info.category}</span>
                    {info.similarity && (
                        <span className="font-medium text-blue-600">
                            {Math.round(info.similarity * 100)}% Match
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

const DuplicateGroup = ({ group, resolution, onConfirmDelete }) => (
    <AnimatePresence mode="wait">
        <motion.div
            key={group.path}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
        >
            {/* Original Image */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
                    <h3 className="text-lg font-semibold">Original Image</h3>
                    <Separator className="flex-1" />
                </div>
                <motion.div
                    className="sticky top-14"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <ImageCard
                        src={group.path}
                        alt="Original"
                        info={{ path: group.path, category: group.category }}
                        resolution={resolution}
                        onConfirmDelete={onConfirmDelete}
                    />
                </motion.div>
            </div>

            {/* Similar Images */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
                    <h3 className="text-lg font-semibold">Similar Images</h3>
                    <span className="text-sm text-muted-foreground">({group.duplicates.length} found)</span>
                    <Separator className="flex-1" />
                </div>
                <ScrollArea className="h-[calc(100vh-280px)]">
                    <motion.div className="space-y-4 pr-4">
                        {group.duplicates.map((duplicate, index) => (
                            <motion.div
                                key={duplicate.path}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <ImageCard
                                    src={duplicate.path}
                                    alt={`Duplicate ${index + 1}`}
                                    info={{
                                        path: duplicate.path,
                                        category: duplicate.category,
                                        similarity: duplicate.similarity
                                    }}
                                    resolution={resolution}
                                    onConfirmDelete={onConfirmDelete}
                                />
                            </motion.div>
                        ))}
                    </motion.div>
                </ScrollArea>
            </div>
        </motion.div>
    </AnimatePresence>
);

const DuplicateChecker: React.FC = () => {
    const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
    const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [threshold, setThreshold] = useState(0.95);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<{ category: string; path: string } | null>(null);
    const [resolution, setResolution] = useState<keyof typeof ImageResolutions>("1080p");

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                navigateGroup('prev');
            } else if (e.key === 'ArrowRight') {
                navigateGroup('next');
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [currentGroupIndex, duplicates.length]);

    const checkDuplicates = async () => {
        try {
            setLoading(true);
            setDuplicates([]);
            setCurrentGroupIndex(0);
            const results = await invoke<DuplicateGroup[]>('find_duplicates', {
                similarityThreshold: threshold
            });
            setDuplicates(results);
        } catch (error) {
            console.error('Error checking duplicates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (category: string, path: string) => {
        setFileToDelete({ category, path });
        setShowConfirmDialog(true);
    };

    const confirmDelete = async () => {
        if (fileToDelete) {
            try {
                await invoke('delete_file', {
                    category: fileToDelete.category,
                    name: fileToDelete.path
                });

                setDuplicates(prevDuplicates => {
                    const updatedDuplicates = prevDuplicates.map(group => {
                        if (group.path === fileToDelete.path) {
                            return null;
                        }
                        return {
                            ...group,
                            duplicates: group.duplicates.filter(
                                duplicate => duplicate.path !== fileToDelete.path
                            )
                        };
                    }).filter(Boolean);

                    if (currentGroupIndex >= updatedDuplicates.length) {
                        setCurrentGroupIndex(Math.max(0, updatedDuplicates.length - 1));
                    }

                    return updatedDuplicates;
                });

                setShowConfirmDialog(false);
            } catch (error) {
                console.error('Error deleting image:', error);
            }
        }
    };

    const navigateGroup = (direction: 'prev' | 'next') => {
        if (!duplicates.length) return;

        setCurrentGroupIndex(prev => {
            if (direction === 'next') {
                return Math.min(prev + 1, duplicates.length - 1);
            } else {
                return Math.max(prev - 1, 0);
            }
        });
    };

    return (
        <TooltipProvider>
            <div className="space-y-4">
                <DuplicateProgress />

                <Card className="w-full">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ImageIcon className="h-5 w-5" />
                                Duplicate Image Checker
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <Settings2 className="h-4 w-4 text-muted-foreground" />
                                        <Select value={resolution} onValueChange={setResolution}>
                                            <SelectTrigger className="w-[130px]">
                                                <SelectValue placeholder="Select quality" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="720p">720p</SelectItem>
                                                <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                                                <SelectItem value="2k">2K</SelectItem>
                                                <SelectItem value="4k">4K</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Separator orientation="vertical" className="h-6" />
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">
                                            Similarity: {Math.round(threshold * 100)}%
                                        </span>
                                        <div className="w-32">
                                            <Slider
                                                value={[threshold]}
                                                onValueChange={([value]) => setThreshold(value)}
                                                min={0.5}
                                                max={1.0}
                                                step={0.01}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <Button onClick={checkDuplicates} disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Checking...
                                        </>
                                    ) : (
                                        'Check Duplicates'
                                    )}
                                </Button>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {duplicates.length > 0 ? (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <Button
                                        variant="outline"
                                        onClick={() => navigateGroup('prev')}
                                        disabled={currentGroupIndex === 0}
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-2" />
                                        Previous Group
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                        Group {currentGroupIndex + 1} of {duplicates.length}
                                    </span>
                                    <Button
                                        variant="outline"
                                        onClick={() => navigateGroup('next')}
                                        disabled={currentGroupIndex === duplicates.length - 1}
                                    >
                                        Next Group
                                        <ChevronRight className="h-4 w-4 ml-2" />
                                    </Button>
                                </div>
                                <Separator />
                                <DuplicateGroup
                                    group={duplicates[currentGroupIndex]}
                                    resolution={resolution}
                                    onConfirmDelete={handleDelete}
                                />
                            </div>
                        ) : !loading && (
                            <div className="text-center py-6 text-muted-foreground">
                                No duplicates found. Click "Check Duplicates" to start scanning.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Image</DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground">
                        Are you sure you want to delete this image? This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setShowConfirmDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                        >
                            Delete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    );
};

export default DuplicateChecker;