"use client"
import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, TagIcon, Folder, AlertCircle, Loader2, X } from "lucide-react"
import { TagItem } from "./TagItem"
import { Separator } from "@/components/ui/separator"
import type { TagInfo } from "@/hooks/use-database"

interface TagListProps {
  tags: TagInfo[]
  selectedTags: TagInfo[]
  onTagToggle: (tag: TagInfo) => void
  isLoading?: boolean
}

type FilterType = "all" | "tags" | "categories"

export function TagList({ tags, selectedTags, onTagToggle, isLoading = false }: TagListProps) {
  const [filterType, setFilterType] = useState<FilterType>("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Count categories and tags
  const counts = useMemo(() => {
    return {
      categories: tags.filter((tag) => tag.is_category).length,
      tags: tags.filter((tag) => !tag.is_category).length,
      total: tags.length,
    }
  }, [tags])

  // Filter tags based on type and search query
  const filteredTags = useMemo(() => {
    return tags.filter((tag) => {
      // Filter by type
      if (filterType === "tags" && tag.is_category) return false
      if (filterType === "categories" && !tag.is_category) return false

      // Filter by search query
      if (searchQuery) {
        return tag.name.toLowerCase().includes(searchQuery.toLowerCase())
      }

      return true
    })
  }, [tags, filterType, searchQuery])

  // Group tags by type for display
  const groupedTags = useMemo(() => {
    const categories = filteredTags.filter((tag) => tag.is_category)
    const regularTags = filteredTags.filter((tag) => !tag.is_category)

    // Sort each group alphabetically
    categories.sort((a, b) => a.name.localeCompare(b.name))
    regularTags.sort((a, b) => a.name.localeCompare(b.name))

    return { categories, regularTags }
  }, [filteredTags])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Loading tags...</p>
      </div>
    )
  }

  // Empty state
  if (tags.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-center">
        <div className="bg-muted/30 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <TagIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No tags available</h3>
        <p className="text-sm text-muted-foreground">Create some tags to get started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Tabs
          defaultValue="all"
          value={filterType}
          onValueChange={(value) => setFilterType(value as FilterType)}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="all" className="flex items-center gap-1.5">
              <span>All ({counts.total})</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-1.5">
              <Folder className="h-3.5 w-3.5 mr-1" />
              <span>Categories ({counts.categories})</span>
            </TabsTrigger>
            <TabsTrigger value="tags" className="flex items-center gap-1.5">
              <TagIcon className="h-3.5 w-3.5 mr-1" />
              <span>Tags ({counts.tags})</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 rounded-full"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {filteredTags.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[200px] text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">
            {searchQuery
              ? `No tags found matching "${searchQuery}"`
              : selectedTags.length === 0
                ? "No tags selected. You can add tags from the 'Add' tab."
                : `No ${filterType === "all" ? "tags" : filterType} available`}
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[300px] pr-4">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div layout className="space-y-4">
              {/* Categories section */}
              {groupedTags.categories.length > 0 && (
                <motion.div layout className="space-y-2">
                  {filterType === "all" && groupedTags.regularTags.length > 0 && (
                    <div className="flex items-center">
                      <Folder className="h-4 w-4 mr-2 text-blue-500" />
                      <h3 className="text-sm font-medium text-muted-foreground">Categories</h3>
                    </div>
                  )}

                  {groupedTags.categories.map((tag) => (
                    <motion.div
                      key={`category-${tag.name}`}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <TagItem
                        tag={tag}
                        isSelected={selectedTags.some((t) => t.name === tag.name)}
                        onClick={() => onTagToggle(tag)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Regular tags section */}
              {groupedTags.regularTags.length > 0 && (
                <motion.div layout className="space-y-2">
                  {filterType === "all" && groupedTags.categories.length > 0 && (
                    <>
                      <Separator />
                      <div className="flex items-center">
                        <TagIcon className="h-4 w-4 mr-2 text-emerald-500" />
                        <h3 className="text-sm font-medium text-muted-foreground">Tags</h3>
                      </div>
                    </>
                  )}

                  {groupedTags.regularTags.map((tag) => (
                    <motion.div
                      key={`tag-${tag.name}`}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <TagItem
                        tag={tag}
                        isSelected={selectedTags.some((t) => t.name === tag.name)}
                        onClick={() => onTagToggle(tag)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </ScrollArea>
      )}
    </div>
  )
}

