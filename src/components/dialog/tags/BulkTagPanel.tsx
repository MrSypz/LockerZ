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
import { useTagOperations } from "@/hooks/use-tag-operations"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle } from "lucide-react"

interface BulkTagPanelProps {
  imageIds: number[]
  onComplete?: () => void
}

export function BulkTagPanel({ imageIds, onComplete }: BulkTagPanelProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("add")
  const [tagsToAdd, setTagsToAdd] = useState<TagInfo[]>([])
  const [availableTags, setAvailableTags] = useState<TagInfo[]>([])
  const [commonTags, setCommonTags] = useState<TagInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState<boolean | null>(null)
  const db = new DatabaseService()

  const loadTags = async () => {
    if (!imageIds.length) return
    setIsLoading(true)
    try {
      const [allTags, ...tagsPerImage] = await Promise.all([
        db.getAllTags(),
        ...imageIds.map((id) => db.getImageTags(id)),
      ])

      setAvailableTags(allTags as unknown as TagInfo[])

      // Tags present on every selected image
      if (tagsPerImage.length > 0) {
        const firstSet = new Set((tagsPerImage[0] as unknown as string[]))
        const commonNames = [...firstSet].filter((name) =>
          tagsPerImage.every((tags) => (tags as unknown as string[]).includes(name))
        )
        setCommonTags(commonNames.map((name) => ({ name, is_category: false })))
      }

      // Always start with an empty add-selection when images change
      setTagsToAdd([])
      setSuccess(null)
    } catch (error) {
      toast({ title: "Error loading tags", description: String(error), variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (imageIds.length > 0) loadTags()
  }, [imageIds])

  const { handleTagCreate, handleTagEdit, handleTagDelete } = useTagOperations(loadTags)

  const handleTagToggle = (tag: TagInfo) => {
    setTagsToAdd((prev) => {
      const exists = prev.find((t) => t.name === tag.name)
      return exists ? prev.filter((t) => t.name !== tag.name) : [...prev, tag]
    })
  }

  const applyTagsToAllImages = async () => {
    if (tagsToAdd.length === 0) return
    try {
      // Additive only: add selected tags to every image that doesn't already have them.
      // Never removes existing per-image tags.
      for (const imageId of imageIds) {
        const existing = (await db.getImageTags(imageId)) as unknown as string[]
        for (const tag of tagsToAdd) {
          if (!existing.includes(tag.name)) {
            await db.addTagImage(imageId, tag.name)
          }
        }
      }
      toast({
        title: "Tags added",
        description: `Added ${tagsToAdd.length} tag(s) to ${imageIds.length} image(s).`,
      })
      setSuccess(true)
      await loadTags()
    } catch (error) {
      toast({ title: "Error adding tags", description: String(error), variant: "destructive" })
      setSuccess(false)
    }
  }

  return (
    <Card className="h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="common">
            Common
            {commonTags.length > 0 && (
              <Badge variant="outline" className="ml-1 text-xs">{commonTags.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="add">
            Add
            {tagsToAdd.length > 0 && (
              <Badge variant="outline" className="ml-1 text-xs">{tagsToAdd.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="create">Create</TabsTrigger>
          <TabsTrigger value="edit">Manage</TabsTrigger>
        </TabsList>

        <div className="p-4 h-[calc(100%-40px)] overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden">
            <TabsContent value="common" className="h-full m-0">
              <p className="text-xs text-muted-foreground mb-3">
                Tags already on <strong>all</strong> selected images. Not affected by applying.
              </p>
              <TagList
                tags={commonTags}
                selectedTags={commonTags}
                onTagToggle={() => {}}
                isLoading={isLoading}
              />
            </TabsContent>

            <TabsContent value="add" className="h-full m-0">
              <p className="text-xs text-muted-foreground mb-3">
                Select tags to <strong>add</strong> to all {imageIds.length} images. Existing tags are never removed.
              </p>
              <TagSearch
                availableTags={availableTags}
                selectedTags={tagsToAdd}
                onTagToggle={handleTagToggle}
                isLoading={isLoading}
              />
            </TabsContent>

            <TabsContent value="create" className="h-full m-0">
              <TagCreator onTagCreate={handleTagCreate} isLoading={isLoading} />
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

          <div className="mt-4 pt-4 border-t">
            {success === true ? (
              <div className="flex items-center justify-center p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-md">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span>Tags added to all images!</span>
              </div>
            ) : success === false ? (
              <div className="flex items-center justify-center p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md">
                <XCircle className="h-5 w-5 mr-2" />
                <span>Error applying tags. Please try again.</span>
              </div>
            ) : (
              <Button
                className="w-full"
                onClick={applyTagsToAllImages}
                disabled={isLoading || tagsToAdd.length === 0}
              >
                {tagsToAdd.length === 0
                  ? "Select tags to add"
                  : `Add ${tagsToAdd.length} tag(s) to ${imageIds.length} images`}
              </Button>
            )}
          </div>
        </div>
      </Tabs>
    </Card>
  )
}
