"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TagList } from "./TagList"
import { TagSearch } from "./TagSearch"
import { TagCreator } from "./TagCreator"
import { TagEditor } from "./TagEditor"
import { DatabaseService, type TagInfo } from "@/hooks/use-database"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface BulkTagPanelProps {
    imageIds: number[]
    onComplete?: () => void
}

export function BulkTagPanel({ imageIds, onComplete }: BulkTagPanelProps) {
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState("current")
    const [selectedTags, setSelectedTags] = useState<TagInfo[]>([])
    const [availableTags, setAvailableTags] = useState<TagInfo[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [commonTags, setCommonTags] = useState<TagInfo[]>([])
    const [isProcessing, setIsProcessing] = useState(false)
    const [processedCount, setProcessedCount] = useState(0)
    const [success, setSuccess] = useState<boolean | null>(null)
    const db = new DatabaseService()

    const loadTags = async () => {
        if (!imageIds.length) return

        setIsLoading(true)
        try {
            // Get all available tags
            const allTags = await db.getAllTags()
            setAvailableTags(allTags)

            // Find common tags across all selected images
            const tagsPerImage = await Promise.all(imageIds.map((id) => db.getImageTags(id)))

            // Find tags that exist in all images
            if (tagsPerImage.length > 0) {
                const firstImageTags = new Set(tagsPerImage[0].map((tag) => tag.name))
                const common = [...firstImageTags].filter((tagName) =>
                    tagsPerImage.every((imageTags) => imageTags.some((tag) => tag.name === tagName)),
                )

                setCommonTags(common.map((name) => ({ name, is_category: false })))
                setSelectedTags(common.map((name) => ({ name, is_category: false })))
            }
        } catch (error) {
            toast({
                title: "Error loading tags",
                description: String(error),
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (imageIds.length > 0) {
            loadTags()
        }
    }, [imageIds])

    const handleTagCreate = async (tagName: string) => {
        try {
            await db.addTag(tagName)
            await loadTags()
            toast({
                title: "Tag created",
                description: `Tag "${tagName}" has been created successfully.`,
            })
        } catch (error) {
            toast({
                title: "Error creating tag",
                description: String(error),
                variant: "destructive",
            })
        }
    }

    const handleTagEdit = async (oldName: string, newName: string) => {
        try {
            await db.editTag(oldName, newName)
            await loadTags()
            toast({
                title: "Tag updated",
                description: `Tag "${oldName}" has been renamed to "${newName}".`,
            })
        } catch (error) {
            toast({
                title: "Error updating tag",
                description: String(error),
                variant: "destructive",
            })
        }
    }

    const handleTagDelete = async (tagName: string) => {
        try {
            await db.deleteTag(tagName)
            await loadTags()
            toast({
                title: "Tag deleted",
                description: `Tag "${tagName}" has been deleted successfully.`,
            })
        } catch (error) {
            toast({
                title: "Error deleting tag",
                description: String(error),
                variant: "destructive",
            })
        }
    }

    const handleTagToggle = async (tag: TagInfo) => {
        // Just update the UI state, actual changes will be applied when saving
        setSelectedTags((prev) => {
            const exists = prev.find((t) => t.name === tag.name)
            if (exists) {
                return prev.filter((t) => t.name !== tag.name)
            } else {
                return [...prev, tag]
            }
        })
    }

    const applyTagsToAllImages = async () => {
        setIsProcessing(true)
        setProcessedCount(0)
        setSuccess(null)

        try {
            // For each image
            for (let i = 0; i < imageIds.length; i++) {
                const imageId = imageIds[i]

                // Get current tags for this image
                const currentTags = await db.getImageTags(imageId)

                // Remove tags that are not in selectedTags
                for (const tag of currentTags) {
                    if (!selectedTags.some((t) => t.name === tag.name)) {
                        await db.removeImageTag(imageId, tag.name)
                    }
                }

                // Add tags that are in selectedTags but not in currentTags
                for (const tag of selectedTags) {
                    if (!currentTags.some((t) => t.name === tag.name)) {
                        await db.addTagImage(imageId, tag.name)
                    }
                }

                setProcessedCount(i + 1)
            }

            toast({
                title: "Tags updated",
                description: `Successfully updated tags for ${imageIds.length} images.`,
            })
            setSuccess(true)

            if (onComplete) {
                setTimeout(() => {
                    onComplete()
                }, 1500)
            }
        } catch (error) {
            toast({
                title: "Error updating tags",
                description: String(error),
                variant: "destructive",
            })
            setSuccess(false)
        } finally {
            setTimeout(() => {
                setIsProcessing(false)
            }, 500)
        }
    }

    return (
        <Card className="h-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                <TabsList className="grid grid-cols-4">
                    <TabsTrigger value="current">Current ({selectedTags.length})</TabsTrigger>
                    <TabsTrigger value="add">Add</TabsTrigger>
                    <TabsTrigger value="create">Create</TabsTrigger>
                    <TabsTrigger value="edit">Manage</TabsTrigger>
                </TabsList>

                <div className="p-4 h-[calc(100%-40px)] overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-hidden">
                        <TabsContent value="current" className="h-full m-0">
                            <TagList
                                tags={selectedTags}
                                selectedTags={selectedTags}
                                onTagToggle={handleTagToggle}
                                isLoading={isLoading}
                            />
                        </TabsContent>

                        <TabsContent value="add" className="h-full m-0">
                            <TagSearch
                                availableTags={availableTags}
                                selectedTags={selectedTags}
                                onTagToggle={handleTagToggle}
                                isLoading={isLoading}
                            />
                        </TabsContent>

                        <TabsContent value="create" className="h-full m-0">
                            <TagCreator onTagCreate={handleTagCreate} isLoading={isLoading} />
                        </TabsContent>

                        <TabsContent value="edit" className="h-full m-0">
                            <TagEditor tags={availableTags} onEdit={handleTagEdit} onDelete={handleTagDelete} isLoading={isLoading} />
                        </TabsContent>
                    </div>

                    {/* Apply Button and Progress */}
                    <div className="mt-4 pt-4 border-t">
                        {isProcessing ? (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Processing images...</span>
                                    <span>
                    {processedCount} / {imageIds.length}
                  </span>
                                </div>
                                <Progress value={(processedCount / imageIds.length) * 100} />
                            </div>
                        ) : success === true ? (
                            <div className="flex items-center justify-center p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-md">
                                <CheckCircle className="h-5 w-5 mr-2" />
                                <span>Tags successfully applied to all images!</span>
                            </div>
                        ) : success === false ? (
                            <div className="flex items-center justify-center p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md">
                                <XCircle className="h-5 w-5 mr-2" />
                                <span>Error applying tags. Please try again.</span>
                            </div>
                        ) : (
                            <Button className="w-full" onClick={applyTagsToAllImages} disabled={isLoading}>
                                Apply Tags to All {imageIds.length} Images
                            </Button>
                        )}
                    </div>
                </div>
            </Tabs>
        </Card>
    )
}

