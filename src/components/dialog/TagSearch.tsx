import React, { useState } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { TagList } from "./TagList"
import { TagInfo } from "@/hooks/use-database"

interface TagSearchProps {
    availableTags: TagInfo[]
    selectedTags: TagInfo[]
    onTagToggle: (tag: TagInfo) => void
    isLoading?: boolean
}

export function TagSearch({ availableTags, selectedTags, onTagToggle, isLoading = false }: TagSearchProps) {
    const [searchTerm, setSearchTerm] = useState("")

    const filteredTags = availableTags.filter(tag =>
        tag.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="shrink-0">
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search tags..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>
            <div className="flex-1 min-h-0">
                <TagList
                    tags={filteredTags}
                    selectedTags={selectedTags}
                    onTagToggle={onTagToggle}
                    isLoading={isLoading}
                />
            </div>
        </div>
    )
}