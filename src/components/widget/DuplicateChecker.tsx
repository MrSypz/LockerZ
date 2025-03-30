"use client"

import { useState, useEffect } from "react"
import { invoke } from "@tauri-apps/api/core"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
    Loader2,
    ImageIcon,
    ChevronLeft,
    ChevronRight,
    FolderOpen,
    Trash,
    Trash2,
    ArrowLeftRight,
    AlertTriangle,
    LayoutGrid,
    SlidersHorizontal,
    ChevronDown,
} from "lucide-react"
import { OptimizedImage } from "@/components/widget/ImageProcessor"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import DuplicateProgress from "@/components/widget/DuplicateProgress"
import { useToast } from "@/hooks/use-toast"

interface ImageInfo {
    path: string
    category: string
    similarity?: number
}

interface DuplicateGroup {
    path: string
    category: string
    duplicates: ImageInfo[]
}

const ImageResolutions = {
    "720p": { width: 1280, height: 720 },
    "1080p": { width: 1920, height: 1080 },
    "2k": { width: 2560, height: 1440 },
    "4k": { width: 3840, height: 2160 },
}

const EmptyState = ({ onScan }) => (
    <div className="flex flex-col items-center justify-center p-10 space-y-6 text-center">
        <div className="rounded-full bg-muted/50 p-8">
            <ImageIcon className="h-16 w-16 text-muted-foreground" />
        </div>
        <div className="space-y-2 max-w-md">
            <h3 className="text-2xl font-semibold">Find Duplicate Images</h3>
            <p className="text-muted-foreground">
                Scan your library to find and manage duplicate or similar images. Adjust settings using the button in the top
                right.
            </p>
        </div>
        <Button size="lg" onClick={onScan} className="mt-4">
            <ImageIcon className="mr-2 h-4 w-4" />
            Start Scanning
        </Button>
    </div>
)

const ImagePreview = ({ src, info, onShowInFolder, onDelete, similarity, isOriginal = false, lowQuality = false }) => {
    const [, setShowActions] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    const handleShowInPhotos = async (path: string) => {
        try {
            await invoke("show_in_photos", { path })
        } catch (error) {
            console.error("Error opening image in Photos app:", error)
        }
    }

    // Use a smaller resolution for gallery view to improve performance
    const imageSize = lowQuality ? { width: 400, height: 400 } : { width: 1920, height: 1080 }

    return (
        <motion.div
            className="relative border rounded-lg overflow-hidden bg-card shadow-sm transition-all group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01 }}
            onHoverStart={() => setShowActions(true)}
            onHoverEnd={() => setShowActions(false)}
        >
            {/* Image */}
            <div
                className="aspect-square relative w-full cursor-pointer overflow-hidden bg-muted"
                onClick={() => handleShowInPhotos(info.path)}
            >
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                )}

                <div className="w-full h-full">
                    <OptimizedImage
                        src={src}
                        alt={`Image ${isOriginal ? "original" : "duplicate"}`}
                        width={imageSize.width}
                        height={imageSize.height}
                        className="object-cover h-full w-full"
                        onLoad={() => setIsLoading(false)}
                    />
                </div>

                {/* Overlay with actions on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200">
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-8 w-8 bg-background/80 backdrop-blur-sm shadow-md"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onShowInFolder(info.path)
                                    }}
                                >
                                    <FolderOpen className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Show in folder</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-8 w-8 bg-background/80 backdrop-blur-sm shadow-md hover:bg-destructive hover:text-destructive-foreground"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onDelete(info.category, info.path)
                                    }}
                                >
                                    <Trash className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete image</TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                {/* Similarity badge */}
                {similarity && (
                    <div className="absolute top-3 left-3">
                        <Badge
                            variant={similarity > 0.95 ? "destructive" : similarity > 0.85 ? "default" : "secondary"}
                            className="font-medium shadow-md"
                        >
                            {Math.round(similarity * 100)}% Match
                        </Badge>
                    </div>
                )}

                {/* Original indicator */}
                {isOriginal && (
                    <div className="absolute bottom-3 left-3">
                        <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
                            Original
                        </Badge>
                    </div>
                )}
            </div>

            {/* Info bar */}
            <div className="p-3">
                <div className="space-y-1">
                    <p className="text-sm font-medium truncate" title={info.path.split("/").pop()}>
                        {info.path.split("/").pop()}
                    </p>
                    <p className="text-xs text-muted-foreground truncate" title={info.category}>
                        {info.category}
                    </p>
                </div>
            </div>
        </motion.div>
    )
}

const SideBySideView = ({ group, onShowInFolder, onDelete }) => {
    const originalImage = {
        path: group.path,
        category: group.category,
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Original image */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
                    <h3 className="text-lg font-medium">Original Image</h3>
                    <Separator className="flex-1" />
                </div>
                <ImagePreview
                    src={originalImage.path || "/placeholder.svg"}
                    info={originalImage}
                    onShowInFolder={onShowInFolder}
                    onDelete={onDelete}
                    isOriginal={true}
                />
            </div>

            {/* Duplicates */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
                    <h3 className="text-lg font-medium">Potential Duplicates</h3>
                    <Badge variant="outline">{group.duplicates.length}</Badge>
                    <Separator className="flex-1" />
                </div>
                <ScrollArea className="h-[calc(100vh-260px)]">
                    <div className="space-y-4 pr-4">
                        {group.duplicates.map((duplicate, index) => (
                            <ImagePreview
                                key={duplicate.path}
                                src={duplicate.path || "/placeholder.svg"}
                                info={duplicate}
                                similarity={duplicate.similarity}
                                onShowInFolder={onShowInFolder}
                                onDelete={onDelete}
                            />
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
    )
}

const GalleryView = ({ group, onShowInFolder, onDelete }) => {
    const originalImage = {
        path: group.path,
        category: group.category,
    }

    // For performance, limit initial display and add pagination
    const [visibleCount, setVisibleCount] = useState(12)
    const hasMore = group.duplicates.length > visibleCount

    const loadMore = () => {
        setVisibleCount((prev) => Math.min(prev + 12, group.duplicates.length))
    }

    return (
        <div className="space-y-6">
            {/* Original image */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium">Original Image</h3>
                    <Separator className="flex-1" />
                </div>
                <div className="max-w-md mx-auto">
                    <ImagePreview
                        src={originalImage.path || "/placeholder.svg"}
                        info={originalImage}
                        onShowInFolder={onShowInFolder}
                        onDelete={onDelete}
                        isOriginal={true}
                    />
                </div>
            </div>

            {/* Duplicates */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium">Potential Duplicates</h3>
                    <Badge variant="outline">{group.duplicates.length}</Badge>
                    <Separator className="flex-1" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {group.duplicates.slice(0, visibleCount).map((duplicate) => (
                        <ImagePreview
                            key={duplicate.path}
                            src={duplicate.path || "/placeholder.svg"}
                            info={duplicate}
                            similarity={duplicate.similarity}
                            onShowInFolder={onShowInFolder}
                            onDelete={onDelete}
                            lowQuality={true}
                        />
                    ))}
                </div>

                {hasMore && (
                    <div className="flex justify-center mt-6">
                        <Button variant="outline" onClick={loadMore} className="w-full max-w-xs">
                            <ChevronDown className="mr-2 h-4 w-4" />
                            Load More ({visibleCount} of {group.duplicates.length})
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}

const SettingsPanel = ({ threshold, setThreshold, resolution, setResolution, onScan, loading }) => (
    <div className="space-y-6 p-1">
        <div>
            <h3 className="text-lg font-medium mb-2">Scan Settings</h3>
            <p className="text-sm text-muted-foreground">
                Configure how the duplicate detection works. Higher threshold values require images to be more similar to be
                considered duplicates.
            </p>
        </div>

        <div className="space-y-6">
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Similarity Threshold</label>
                    <span className="text-sm font-mono bg-muted py-0.5 px-2 rounded">{Math.round(threshold * 100)}%</span>
                </div>
                <Slider
                    value={[threshold]}
                    onValueChange={([value]) => setThreshold(value)}
                    min={0.5}
                    max={1.0}
                    step={0.01}
                    className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>More Results</span>
                    <span>Higher Accuracy</span>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Image Preview Quality</label>
                <Select value={resolution} onValueChange={setResolution}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select quality" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="720p">720p (Faster)</SelectItem>
                        <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                        <SelectItem value="2k">2K</SelectItem>
                        <SelectItem value="4k">4K (Higher Quality)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        <Button className="w-full" size="lg" onClick={onScan} disabled={loading}>
            {loading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                </>
            ) : (
                <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Start Scan
                </>
            )}
        </Button>
    </div>
)

const DuplicateChecker = () => {
    const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([])
    const [currentGroupIndex, setCurrentGroupIndex] = useState(0)
    const [loading, setLoading] = useState(false)
    const [threshold, setThreshold] = useState(0.85)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [fileToDelete, setFileToDelete] = useState<{ category: string; path: string } | null>(null)
    const [resolution, setResolution] = useState<keyof typeof ImageResolutions>("1080p")
    const [viewMode, setViewMode] = useState<"sideBySide" | "gallery">("sideBySide")
    const [settingsOpen, setSettingsOpen] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") {
                navigateGroup("prev")
            } else if (e.key === "ArrowRight") {
                navigateGroup("next")
            }
        }

        window.addEventListener("keydown", handleKeyPress)
        return () => window.removeEventListener("keydown", handleKeyPress)
    }, [currentGroupIndex, duplicates.length])

    const checkDuplicates = async () => {
        try {
            setLoading(true)
            setDuplicates([])
            setCurrentGroupIndex(0)
            setSettingsOpen(false)

            const results = await invoke<DuplicateGroup[]>("find_duplicates", {
                similarityThreshold: threshold,
            })

            setDuplicates(results)

            if (results.length > 0) {
                toast({
                    title: "Scan Complete",
                    description: `Found ${results.length} groups of similar images.`,
                    duration: 3000,
                })
            } else {
                toast({
                    title: "No Duplicates Found",
                    description: "Try lowering the similarity threshold to find more potential matches.",
                    duration: 3000,
                })
            }
        } catch (error) {
            console.error("Error checking duplicates:", error)
            toast({
                title: "Error Scanning",
                description: "There was a problem scanning for duplicates.",
                variant: "destructive",
                duration: 5000,
            })
        } finally {
            setLoading(false)
        }
    }

    const handleShowInFolder = async (path: string) => {
        try {
            await invoke("show_in_folder", { path })
        } catch (error) {
            console.error("Error opening folder:", error)
            toast({
                title: "Could not open folder",
                description: "There was a problem opening the file location.",
                variant: "destructive",
            })
        }
    }

    const handleDelete = (category: string, path: string) => {
        setFileToDelete({ category, path })
        setShowConfirmDialog(true)
    }

    const confirmDelete = async () => {
        if (fileToDelete) {
            try {
                await invoke("delete_file", {
                    category: fileToDelete.category,
                    name: fileToDelete.path,
                })

                toast({
                    title: "Image Deleted",
                    description: "The image was successfully deleted.",
                    duration: 3000,
                })

                // Update the duplicates state to remove the deleted image
                setDuplicates((prevDuplicates) => {
                    const updatedDuplicates = prevDuplicates
                        .map((group) => {
                            // If the original was deleted, remove the whole group
                            if (group.path === fileToDelete.path) {
                                return null
                            }

                            // If a duplicate was deleted, remove it from the group
                            return {
                                ...group,
                                duplicates: group.duplicates.filter((duplicate) => duplicate.path !== fileToDelete.path),
                            }
                        })
                        .filter(Boolean) // Remove null groups
                        .filter((group) => group.duplicates.length > 0) // Remove groups with no duplicates left

                    // Adjust current group index if needed
                    if (currentGroupIndex >= updatedDuplicates.length) {
                        setCurrentGroupIndex(Math.max(0, updatedDuplicates.length - 1))
                    }

                    return updatedDuplicates
                })

                setShowConfirmDialog(false)
            } catch (error) {
                console.error("Error deleting image:", error)
                toast({
                    title: "Error Deleting Image",
                    description: "There was a problem deleting the image.",
                    variant: "destructive",
                    duration: 5000,
                })
            }
        }
    }

    const navigateGroup = (direction: "prev" | "next") => {
        if (!duplicates.length) return

        setCurrentGroupIndex((prev) => {
            if (direction === "next") {
                return Math.min(prev + 1, duplicates.length - 1)
            } else {
                return Math.max(prev - 1, 0)
            }
        })
    }

    return (
        <TooltipProvider>
            <div className="space-y-4">
                <DuplicateProgress />

                {/* Main Content */}
                <Card className="w-full overflow-hidden">
                    {duplicates.length > 0 ? (
                        <div>
                            {/* Header with navigation and controls */}
                            <div className="bg-muted/30 border-b px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => navigateGroup("prev")}
                                        disabled={currentGroupIndex === 0}
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-1" />
                                        Previous
                                    </Button>

                                    <span className="text-sm px-2">
                    Group <span className="font-medium">{currentGroupIndex + 1}</span> of{" "}
                                        <span className="font-medium">{duplicates.length}</span>
                  </span>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => navigateGroup("next")}
                                        disabled={currentGroupIndex === duplicates.length - 1}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="bg-muted/50 rounded-md p-1 flex">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className={`h-8 rounded-sm ${viewMode === "sideBySide" ? "bg-background" : ""}`}
                                                    onClick={() => setViewMode("sideBySide")}
                                                >
                                                    <ArrowLeftRight className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Side by Side View</TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className={`h-8 rounded-sm ${viewMode === "gallery" ? "bg-background" : ""}`}
                                                    onClick={() => setViewMode("gallery")}
                                                >
                                                    <LayoutGrid className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Gallery View</TooltipContent>
                                        </Tooltip>
                                    </div>

                                    <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
                                        <SheetTrigger asChild>
                                            <Button variant="outline" size="icon" className="h-8 w-8">
                                                <SlidersHorizontal className="h-4 w-4" />
                                            </Button>
                                        </SheetTrigger>
                                        <SheetContent>
                                            <SheetHeader>
                                                <SheetTitle>Scan Settings</SheetTitle>
                                            </SheetHeader>
                                            <div className="mt-6">
                                                <SettingsPanel
                                                    threshold={threshold}
                                                    setThreshold={setThreshold}
                                                    resolution={resolution}
                                                    setResolution={setResolution}
                                                    onScan={checkDuplicates}
                                                    loading={loading}
                                                />
                                            </div>
                                        </SheetContent>
                                    </Sheet>
                                </div>
                            </div>

                            {/* Content */}
                            <CardContent className="p-6">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={`${duplicates[currentGroupIndex].path}-${viewMode}`}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {viewMode === "sideBySide" ? (
                                            <SideBySideView
                                                group={duplicates[currentGroupIndex]}
                                                onShowInFolder={handleShowInFolder}
                                                onDelete={handleDelete}
                                            />
                                        ) : (
                                            <GalleryView
                                                group={duplicates[currentGroupIndex]}
                                                onShowInFolder={handleShowInFolder}
                                                onDelete={handleDelete}
                                            />
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </CardContent>
                        </div>
                    ) : (
                        <CardContent className="p-0">
                            <div className="flex items-center justify-between bg-muted/30 border-b px-4 py-3">
                                <h2 className="text-lg font-medium">Duplicate Image Finder</h2>
                                <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
                                    <SheetTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            <SlidersHorizontal className="h-4 w-4 mr-2" />
                                            Scan Settings
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent>
                                        <SheetHeader>
                                            <SheetTitle>Scan Settings</SheetTitle>
                                        </SheetHeader>
                                        <div className="mt-6">
                                            <SettingsPanel
                                                threshold={threshold}
                                                setThreshold={setThreshold}
                                                resolution={resolution}
                                                setResolution={setResolution}
                                                onScan={checkDuplicates}
                                                loading={loading}
                                            />
                                        </div>
                                    </SheetContent>
                                </Sheet>
                            </div>
                            <div className="p-6">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                                        <p className="text-muted-foreground">Scanning for duplicate images...</p>
                                    </div>
                                ) : (
                                    <EmptyState onScan={checkDuplicates} />
                                )}
                            </div>
                        </CardContent>
                    )}
                </Card>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Delete Image
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-3">
                        <p className="mb-2">Are you sure you want to delete this image?</p>
                        <p className="text-sm text-muted-foreground">
                            This action cannot be undone. The file will be permanently removed from your system.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Permanently
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    )
}

export default DuplicateChecker

