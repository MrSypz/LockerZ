import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
    Loader2,
    Image as ImageIcon,
    ChevronLeft,
    ChevronRight,
    FolderOpen,
    Trash,
    Settings2
} from 'lucide-react';
import { OptimizedImage } from "@/components/widget/ImageProcessor";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DialogBody } from "next/dist/client/components/react-dev-overlay/internal/components/Dialog";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const ImageResolutions = {
    "720p": { width: 1280, height: 720 },
    "1080p": { width: 1920, height: 1080 },
    "2k": { width: 2560, height: 1440 },
    "4k": { width: 3840, height: 2160 }
};

const ImageCard = ({ src, alt, info, resolution, onConfirmDelete }) => {
    const handleShowInFolder = async (path) => {
        try {
            await invoke('show_in_folder', { path });
        } catch (error) {
            console.error('Error opening folder:', error);
        }
    };

    const handleShowInPhotos = async (path) => {
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

import { motion, AnimatePresence } from "framer-motion";
import DuplicateProgress from "@/components/widget/DuplicateProgress";

const DuplicateGroup = ({ group, resolution, onConfirmDelete }) => (
    <AnimatePresence mode="wait">
        <motion.div
            key={group.path}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0, transition: { type: "spring", stiffness: 200, damping: 25 } }}
            exit={{ opacity: 0, x: -20, transition: { type: "spring", stiffness: 200, damping: 25 } }}
            className="grid grid-cols-2 gap-8"
        >
            {/* Original Image - Left Column */}
            <div className="space-y-4">
                <motion.div
                    className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 150, damping: 20 }}
                >
                    <h3 className="text-lg font-semibold">Original Image</h3>
                    <Separator className="flex-1" />
                </motion.div>
                <motion.div
                    className="sticky top-14"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1, transition: { delay: 0.2, type: "spring", stiffness: 200, damping: 25 } }}
                    transition={{ delay: 0.2 }}
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

            {/* Similar Images - Right Column */}
            <div className="space-y-4">
                <motion.div
                    className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 150, damping: 20 }}
                >
                    <h3 className="text-lg font-semibold">Similar Images</h3>
                    <span className="text-sm text-muted-foreground">
                        ({group.duplicates.length} found)
                    </span>
                    <Separator className="flex-1" />
                </motion.div>
                <ScrollArea className="h-[calc(100vh-280px)]">
                    <motion.div
                        className="space-y-4 pr-4"
                        initial="hidden"
                        animate="visible"
                        variants={{
                            hidden: {},
                            visible: {
                                transition: {
                                    staggerChildren: 0.1
                                }
                            }
                        }}
                    >
                        {group.duplicates.map((duplicate, index) => (
                            <motion.div
                                key={index}
                                variants={{
                                    hidden: { opacity: 0, x: 20 },
                                    visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 150, damping: 25 } }
                                }}
                                transition={{ duration: 0.3 }}
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

const DuplicateChecker = () => {
    const [duplicates, setDuplicates] = useState([]);
    const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [threshold, setThreshold] = useState(0.95);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [fileToDelete, setFileToDelete] = useState(null);
    const [resolution, setResolution] = useState("1080p");

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
            const results = await invoke('find_duplicates', {
                similarityThreshold: threshold
            });
            setDuplicates(results);
        } catch (error) {
            console.error('Error checking duplicates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (category, name) => {
        setFileToDelete({ category, name });
        setShowConfirmDialog(true);
    };

    const confirmDelete = async () => {
        if (fileToDelete) {
            try {
                await invoke('delete_file', {
                    category: fileToDelete.category,
                    name: fileToDelete.name
                });

                setDuplicates(prevDuplicates => {
                    const updatedDuplicates = prevDuplicates.map(group => {
                        if (group.path === fileToDelete.name) {
                            return null;
                        }
                        return {
                            ...group,
                            duplicates: group.duplicates.filter(
                                duplicate => duplicate.path !== fileToDelete.name
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

    const navigateGroup = (direction) => {
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
                                <ImageIcon className="h-5 w-5"/>
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
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
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
                    <DialogBody className="flex justify-end gap-2 mt-4">
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
                    </DialogBody>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    );
};

export default DuplicateChecker;