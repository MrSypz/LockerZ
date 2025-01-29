'use client'
import React, {useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Slider} from '@/components/ui/slider';
import {Loader2, Image as ImageIcon, ArrowRight, FolderOpen, Trash} from 'lucide-react';
import DuplicateProgress from './DuplicateProgress';
import {OptimizedImage} from "@/components/widget/ImageProcessor";
import {ScrollArea, ScrollBar} from "@/components/ui/scroll-area";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {DialogBody} from "next/dist/client/components/react-dev-overlay/internal/components/Dialog";

const ImageCard = ({ src, alt, info, size = "md", onConfirmDelete}) => {
    const sizeClasses = {
        sm: "w-48",
        md: "w-64",
        lg: "w-80"
    };

    const handleShowInFolder = async (path) => {
        try {
            await invoke('show_in_folder', { path });
        } catch (error) {
            console.error('Error opening folder:', error);
        }
    };

    const handleShowInPhotos = async (path) => {
        try {
            await invoke('show_in_photos', { path }); // Invoke the Tauri command
        } catch (error) {
            console.error('Error opening image in Photos app:', error);
        }
    };

    const handleDelete = async (category, name) => {
        onConfirmDelete(category, name); // Trigger confirmation dialog
    };

    return (
        <div className={`flex-shrink-0 border rounded-lg overflow-hidden ${sizeClasses[size]}`}>
            <div
                className="aspect-square w-full relative cursor-pointer" // Add cursor-pointer for better UX
                onClick={() => handleShowInPhotos(info.path)} // Call handleShowInPhotos on click
            >
                <OptimizedImage
                    src={src}
                    alt={alt}
                />
            </div>
            {info && (
                <div className="p-3 space-y-1.5 bg-background">
                    <div className="flex items-start gap-2">
                        <p className="text-sm text-muted-foreground truncate flex-1" title={info.path}>
                            {info.path}
                        </p>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0"
                                    onClick={() => handleShowInFolder(info.path)}
                                >
                                    <FolderOpen className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                Show in folder
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0"
                                    onClick={() => handleDelete(info.category, info.path)}
                                >
                                    <Trash className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                Delete Image
                            </TooltipContent>
                        </Tooltip>
                    </div>
                    {info.category && (
                        <p className="text-sm font-medium">
                            {info.category}
                        </p>
                    )}
                    {info.similarity && (
                        <p className="text-sm font-medium text-blue-600">
                            {Math.round(info.similarity * 100)}% Similar
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};
const DuplicateGroup = ({group, onDelete, onConfirmDelete}) => (
    <div className="flex gap-6 items-start">
        <ImageCard
            src={group.path}
            alt="Original"
            info={{path: group.path, category: group.category}}
            size="lg"
            onDelete={onDelete}
            onConfirmDelete={onConfirmDelete}
        />
        <div className="flex items-center text-muted-foreground h-full pt-32">
            <ArrowRight className="h-8 w-8"/>
        </div>
        <ScrollArea className="w-full rounded-lg">
            <div className="flex gap-4 pb-4">
                {group.duplicates.map((duplicate, dupIndex) => (
                    <ImageCard
                        key={dupIndex}
                        src={duplicate.path}
                        alt={`Duplicate ${dupIndex + 1}`}
                        info={{
                            path: duplicate.path,
                            category: duplicate.category,
                            similarity: duplicate.similarity
                        }}
                        size="md"
                        onDelete={onDelete}
                        onConfirmDelete={onConfirmDelete}
                    />
                ))}
            </div>
            <ScrollBar orientation="horizontal"/>
        </ScrollArea>
    </div>
);

const DuplicateChecker = () => {
    const [duplicates, setDuplicates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [threshold, setThreshold] = useState(0.95);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [fileToDelete, setFileToDelete] = useState(null);

    const checkDuplicates = async () => {
        try {
            setLoading(true);
            setDuplicates([]);
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
        setFileToDelete({category, name});
        setShowConfirmDialog(true);
    };

    const confirmDelete = async () => {
        if (fileToDelete) {
            try {
                // Call Tauri to delete the file
                await invoke('delete_file', {
                    category: fileToDelete.category,
                    name: fileToDelete.name
                });
                // Remove from state after deletion
                setDuplicates(prevDuplicates => {
                    return prevDuplicates.map(group => ({
                        ...group,
                        duplicates: group.duplicates.filter(duplicate => duplicate.path !== fileToDelete.name)
                    })).filter(group => group.path !== fileToDelete.name); // Remove the group if no more duplicates exist
                });
                setShowConfirmDialog(false);
            } catch (error) {
                console.error('Error deleting image:', error);
            }
        }
    };

    const cancelDelete = () => {
        setShowConfirmDialog(false);
    };

    return (
        <TooltipProvider>
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ImageIcon className="h-5 w-5"/>
                            Duplicate Image Checker
                        </div>
                        <div className="flex items-center gap-4">
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
                        <div className="space-y-8">
                            {duplicates.map((group, index) => (
                                <DuplicateGroup key={index} group={group} onDelete={handleDelete}
                                                onConfirmDelete={handleDelete}/>
                            ))}
                        </div>
                    ) : !loading && (
                        <div className="text-center py-6 text-muted-foreground">
                            No duplicates found. Click "Check Duplicates" to start scanning.
                        </div>
                    )}
                </CardContent>
            </Card>
            <DuplicateProgress/>

            {/* Confirmation Dialog */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent className="rounded-lg shadow-lg p-6 max-w-sm mx-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold ">
                            Are you sure you want to delete this image?
                        </DialogTitle>
                    </DialogHeader>
                    <DialogBody className="mt-4">
                        <div className="flex justify-end space-x-4">
                            <Button
                                variant="outline"
                                onClick={cancelDelete}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={confirmDelete}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                                Confirm Delete
                            </Button>
                        </div>
                    </DialogBody>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    );
};

export default DuplicateChecker;
