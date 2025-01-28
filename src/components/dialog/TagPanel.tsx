import React, { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TagList } from "./TagList"
import { TagSearch } from "./TagSearch"
import { TagCreator } from "./TagCreator"
import { TagEditor } from "./TagEditor"
import { DatabaseService, TagInfo } from "@/hooks/use-database"
import { useToast } from "@/hooks/use-toast"

interface TagPanelProps {
    imageId: number
}

export function TagPanel({ imageId }: TagPanelProps) {
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState("current")
    const [selectedTags, setSelectedTags] = useState<TagInfo[]>([])
    const [availableTags, setAvailableTags] = useState<TagInfo[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const db = new DatabaseService()

    const loadTags = async () => {
        setIsLoading(true)
        try {
            const imageTags = await db.getImageTags(imageId)
            setSelectedTags(imageTags)
            const allTags = await db.getAllTags()
            setAvailableTags(allTags)
        } catch (error) {
            toast({
                title: "Error loading tags",
                description: String(error),
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (imageId) {
            loadTags()
        }
    }, [imageId])

    const handleTagCreate = async (tagName: string) => {
        try {
            await db.addTag(tagName)
            await loadTags()
            toast({
                title: "Tag created",
                description: `Tag "${tagName}" has been created successfully.`
            })
        } catch (error) {
            toast({
                title: "Error creating tag",
                description: String(error),
                variant: "destructive"
            })
        }
    }

    const handleTagEdit = async (oldName: string, newName: string) => {
        try {
            await db.editTag(oldName, newName)
            await loadTags()
            toast({
                title: "Tag updated",
                description: `Tag "${oldName}" has been renamed to "${newName}".`
            })
        } catch (error) {
            toast({
                title: "Error updating tag",
                description: String(error),
                variant: "destructive"
            })
        }
    }

    const handleTagDelete = async (tagName: string) => {
        try {
            await db.deleteTag(tagName)
            await loadTags()
            toast({
                title: "Tag deleted",
                description: `Tag "${tagName}" has been deleted successfully.`
            })
        } catch (error) {
            toast({
                title: "Error deleting tag",
                description: String(error),
                variant: "destructive"
            })
        }
    }

    const handleTagToggle = async (tag: TagInfo) => {
        try {
            if (selectedTags.find(t => t.name === tag.name)) {
                await db.removeImageTag(imageId, tag.name)
                setSelectedTags(prev => prev.filter(t => t.name !== tag.name))
            } else {
                await db.addTagImage(imageId, tag.name)
                setSelectedTags(prev => [...prev, tag])
            }
        } catch (error) {
            toast({
                title: "Error updating tags",
                description: String(error),
                variant: "destructive"
            })
        }
    }

    return (
        <Card className="h-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                <TabsList className="grid grid-cols-4">
                    <TabsTrigger value="current">
                        Current ({selectedTags.length})
                    </TabsTrigger>
                    <TabsTrigger value="add">Add</TabsTrigger>
                    <TabsTrigger value="create">Create</TabsTrigger>
                    <TabsTrigger value="edit">Manage</TabsTrigger>
                </TabsList>

                <div className="p-4 h-[calc(100%-40px)] overflow-hidden">
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
                        <TagCreator
                            onTagCreate={handleTagCreate}
                            isLoading={isLoading}
                        />
                    </TabsContent>

                    <TabsContent value="edit" className="h-full m-0">
                        <TagEditor
                            tags={availableTags}
                            onEdit={handleTagEdit}
                            onDelete={handleTagDelete}
                            isLoading={isLoading}
                        />
                    </TabsContent>
                </div>
            </Tabs>
        </Card>
    )
}