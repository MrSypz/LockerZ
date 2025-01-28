import React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertCircle } from "lucide-react"
import {TagItem} from "@/components/dialog/TagItem";
import {TagInfo} from "@/hooks/use-database";

interface TagListProps {
    tags: TagInfo[]
    selectedTags: TagInfo[]
    onTagToggle: (tag: TagInfo) => void
    isLoading?: boolean
}

export function TagList({ tags, selectedTags, onTagToggle, isLoading = false }: TagListProps) {
    // Separate categories and regular tags
    const categories = tags.filter(tag => tag.is_category)
    const regularTags = tags.filter(tag => !tag.is_category)

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-pulse space-y-2">
                    <div className="h-8 w-32 bg-muted rounded" />
                    <div className="h-8 w-48 bg-muted rounded" />
                    <div className="h-8 w-40 bg-muted rounded" />
                </div>
            </div>
        )
    }

    if (tags.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>No tags available</p>
            </div>
        )
    }

    return (
        <ScrollArea className="h-full pr-4">
            <div className="space-y-6">
                {/* Categories section */}
                {categories.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">
                            Categories
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {categories.map((tag) => (
                                <TagItem
                                    key={tag.name}
                                    tag={tag}
                                    isSelected={selectedTags.some(t => t.name === tag.name)}
                                    isPending={true}
                                    onClick={() => onTagToggle(tag)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Regular tags section */}
                {regularTags.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">
                            Tags
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {regularTags.map((tag) => (
                                <TagItem
                                    key={tag.name}
                                    tag={tag}
                                    isSelected={selectedTags.some(t => t.name === tag.name)}
                                    isPending={true}
                                    onClick={() => onTagToggle(tag)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </ScrollArea>
    )
}