
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TagList } from "./TagList"
import { TagSearch } from "./TagSearch"
import { TagCreator } from "./TagCreator"
import { TagEditor } from "./TagEditor"
import { DatabaseService, type TagInfo } from "@/hooks/use-database"
import { useToast } from "@/hooks/use-toast"
import { useTagOperations } from "@/hooks/use-tag-operations"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Tag, Plus, Settings, Search } from "lucide-react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"

interface TagPanelProps {
    imageId: number
    onComplete?: (success: boolean) => void
}

export function TagPanel({ imageId, onComplete }: TagPanelProps) {
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState("current")
    const [selectedTags, setSelectedTags] = useState<TagInfo[]>([])
    const [initialTags, setInitialTags] = useState<TagInfo[]>([])
    const [availableTags, setAvailableTags] = useState<TagInfo[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [success, setSuccess] = useState<boolean | null>(null)
    const db = new DatabaseService()

    const loadTags = async () => {
        setIsLoading(true)
        try {
            const [imageTags, allTags] = await Promise.all([
                db.getImageTags(imageId),
                db.getAllTags(),
            ])
            setSelectedTags(imageTags as unknown as TagInfo[])
            setInitialTags(imageTags as unknown as TagInfo[])
            setAvailableTags(allTags as unknown as TagInfo[])
        } catch (error) {
            toast({ title: "Error loading tags", description: String(error), variant: "destructive" })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (imageId) loadTags()
    }, [imageId])

    const { handleTagCreate, handleTagEdit, handleTagDelete } = useTagOperations(loadTags)

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

    const applyTagsToImage = async () => {
        try {
            // Get current tags for this image
            const currentTags = await db.getImageTags(imageId)

            // If we have no selected tags, remove all tags
            if (selectedTags.length === 0) {
                for (const tag of currentTags) {
                    await db.removeImageTag(imageId, tag.name)
                }
            } else {
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
            }

            const message =
                selectedTags.length === 0
                    ? "Successfully removed all tags from image."
                    : `Successfully applied ${selectedTags.length} tags to image.`

            toast({
                title: "Tags updated",
                description: message,
            })
            setSuccess(true)
            setInitialTags([...selectedTags])
        } catch (error) {
            toast({
                title: "Error updating tags",
                description: String(error),
                variant: "destructive",
            })
            setSuccess(false)
            if (onComplete) {
                onComplete(false)
            }
        }
    }

    const hasChanges = () => {
        if (selectedTags.length !== initialTags.length) return true

        // Check if any tags are different
        for (const tag of selectedTags) {
            if (!initialTags.some((t) => t.name === tag.name)) {
                return true
            }
        }

        return false
    }

    const tabIcons = {
        current: <Tag className="h-4 w-4 mr-2" />,
        add: <Search className="h-4 w-4 mr-2" />,
        create: <Plus className="h-4 w-4 mr-2" />,
        edit: <Settings className="h-4 w-4 mr-2" />,
    }

    return (
        <Card className="h-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                <TabsList className="grid grid-cols-4 p-1">
                    <TabsTrigger
                        value="current"
                        className="flex items-center data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                    >
                        {tabIcons.current}
                        <span>Current</span>
                        <Badge variant="outline" className="ml-2 bg-primary/10 text-primary text-xs">
                            {selectedTags.length}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger
                        value="add"
                        className="flex items-center data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
                    >
                        {tabIcons.add}
                        <span>Find</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="create"
                        className="flex items-center data-[state=active]:bg-green-50 dark:data-[state=active]:bg-green-900/20 data-[state=active]:text-green-600 dark:data-[state=active]:text-green-400"
                    >
                        {tabIcons.create}
                        <span>Create</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="edit"
                        className="flex items-center data-[state=active]:bg-amber-50 dark:data-[state=active]:bg-amber-900/20 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400"
                    >
                        {tabIcons.edit}
                        <span>Manage</span>
                    </TabsTrigger>
                </TabsList>

                <div className="p-4 h-[calc(100%-56px)] overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-hidden">
                        <TabsContent value="current" className="h-full m-0">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-sm font-medium text-muted-foreground">Currently applied tags</h3>
                                {selectedTags.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedTags([])}
                                        className="text-xs text-muted-foreground hover:text-destructive"
                                    >
                                        Clear all
                                    </Button>
                                )}
                            </div>
                            <TagList
                                tags={selectedTags}
                                selectedTags={selectedTags}
                                onTagToggle={handleTagToggle}
                                isLoading={isLoading}
                            />
                        </TabsContent>

                        <TabsContent value="add" className="h-full m-0">
                            <div className="mb-3">
                                <h3 className="text-sm font-medium text-muted-foreground">Find and add tags</h3>
                            </div>
                            <TagSearch
                                availableTags={availableTags}
                                selectedTags={selectedTags}
                                onTagToggle={handleTagToggle}
                                isLoading={isLoading}
                            />
                        </TabsContent>

                        <TabsContent value="create" className="h-full m-0">
                            <div className="mb-3">
                                <h3 className="text-sm font-medium text-muted-foreground">Create new tags</h3>
                            </div>
                            <TagCreator onTagCreate={handleTagCreate} isLoading={isLoading} />
                        </TabsContent>

                        <TabsContent value="edit" className="h-full m-0">
                            <div className="mb-3">
                                <h3 className="text-sm font-medium text-muted-foreground">Manage existing tags</h3>
                            </div>
                            <TagEditor tags={availableTags} onEdit={handleTagEdit} onDelete={handleTagDelete} isLoading={isLoading} />
                        </TabsContent>
                    </div>

                    {/* Apply Button and Progress */}
                    <div className="mt-4 pt-4 border-t">
                        {success === true ? (
                            <div className="flex items-center justify-center p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-md">
                                <CheckCircle className="h-5 w-5 mr-2" />
                                <span>Tags successfully applied to image!</span>
                            </div>
                        ) : success === false ? (
                            <div className="flex items-center justify-center p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md">
                                <XCircle className="h-5 w-5 mr-2" />
                                <span>Error applying tags. Please try again.</span>
                            </div>
                        ) : (
                            <Button
                                className="w-full group relative overflow-hidden"
                                onClick={applyTagsToImage}
                                disabled={isLoading || !hasChanges()}
                                size="lg"
                            >
                                <motion.span
                                    className="absolute inset-0 bg-primary/10"
                                    initial={{ scaleX: 0 }}
                                    whileHover={{ scaleX: 1 }}
                                    transition={{ duration: 0.3 }}
                                    style={{ transformOrigin: "left" }}
                                />
                                <span className="relative z-10 flex items-center gap-2">
                  {selectedTags.length === 0 ? (
                      <>
                          <XCircle className="h-5 w-5" />
                          Remove All Tags
                      </>
                  ) : (
                      <>
                          <CheckCircle className="h-5 w-5" />
                          {`Apply ${selectedTags.length} Tags`}
                      </>
                  )}
                </span>
                            </Button>
                        )}
                    </div>
                </div>
            </Tabs>
        </Card>
    )
}
