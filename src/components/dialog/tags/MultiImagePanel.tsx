"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { OptimizedImage } from "@/components/widget/ImageProcessor"
import { useSharedSettings } from "@/utils/SettingsContext"
import type { File } from "@/types/file"
import { ImageIcon, Tag, FolderIcon, ScaleIcon, Info } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatBytes } from "@/components/widget/Dashboard"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface MultiImagePanelProps {
    files: File[]
}

export function MultiImagePanel({ files }: MultiImagePanelProps) {
    const { settings } = useSharedSettings()
    const [selectedImageIndex, setSelectedImageIndex] = useState(0)
    const selectedFile = files[selectedImageIndex]

    // Calculate some statistics about the selected files
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    const categories = [...new Set(files.map((file) => file.category))]

    return (
        <Card className="h-full overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Selected Images ({files.length})
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-4 overflow-hidden">
                {/* Selected Image Preview */}
                <div className="relative aspect-square rounded-lg overflow-hidden">
                    <OptimizedImage
                        src={selectedFile.filepath}
                        alt={selectedFile.name}
                        width={settings.imageWidth}
                        height={settings.imageHeight}
                        quality={settings.imageQuality}
                    />
                    <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm rounded-md px-2 py-1 text-xs">
                        {selectedImageIndex + 1} / {files.length}
                    </div>
                </div>

                {/* Image Selection */}
                <div className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="grid grid-cols-3 gap-2">
                            {files.map((file, index) => (
                                <button
                                    key={`${file.category}-${file.name}`}
                                    className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all ${
                                        index === selectedImageIndex
                                            ? "border-primary ring-2 ring-primary/20"
                                            : "border-transparent hover:border-primary/50"
                                    }`}
                                    onClick={() => setSelectedImageIndex(index)}
                                >
                                    <OptimizedImage src={file.filepath} alt={file.name} width={80} height={80} quality={50} />
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </div>

                {/* Batch Information */}
                <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Images:</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{files.length}</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ScaleIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Total Size:</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{formatBytes(totalSize)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FolderIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Categories:</span>
                        </div>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground truncate max-w-[100px]">
                      {categories.length === 1 ? categories[0] : `${categories.length} categories`}
                    </span>
                                        {categories.length > 1 && <Info className="h-3 w-3 text-muted-foreground" />}
                                    </div>
                                </TooltipTrigger>
                                {categories.length > 1 && (
                                    <TooltipContent>
                                        <ul className="list-disc pl-4">
                                            {categories.map((category) => (
                                                <li key={category}>{category}</li>
                                            ))}
                                        </ul>
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

