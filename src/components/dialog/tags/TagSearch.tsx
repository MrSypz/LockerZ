"use client"
import { useState, useEffect } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X, History, TagIcon, Folder } from "lucide-react"
import { TagItem } from "@/components/dialog/tags/TagItem"
import type { TagInfo } from "@/hooks/use-database"
import { motion, AnimatePresence } from "framer-motion"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface TagSearchProps {
  availableTags: TagInfo[]
  selectedTags: TagInfo[]
  onTagToggle: (tag: TagInfo) => void
  isLoading?: boolean
}

export function TagSearch({ availableTags, selectedTags, onTagToggle, isLoading = false }: TagSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [showRecentSearches, setShowRecentSearches] = useState(false)
  const [filterType, setFilterType] = useState<"all" | "categories" | "tags">("all")

  // Load recent searches from localStorage
  useEffect(() => {
    const savedSearches = localStorage.getItem("recentTagSearches")
    if (savedSearches) {
      setRecentSearches(JSON.parse(savedSearches))
    }
  }, [])

  // Save recent searches to localStorage
  const saveSearch = (term: string) => {
    if (!term.trim() || recentSearches.includes(term)) return

    const updatedSearches = [term, ...recentSearches].slice(0, 5)
    setRecentSearches(updatedSearches)
    localStorage.setItem("recentTagSearches", JSON.stringify(updatedSearches))
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    if (term.trim()) {
      saveSearch(term)
    }
    setShowRecentSearches(false)
  }

  const handleInputFocus = () => {
    if (recentSearches.length > 0 && !searchTerm) {
      setShowRecentSearches(true)
    }
  }

  const handleClearSearch = () => {
    setSearchTerm("")
    setShowRecentSearches(false)
  }

  const handleRemoveRecentSearch = (index: number) => {
    const updatedSearches = [...recentSearches]
    updatedSearches.splice(index, 1)
    setRecentSearches(updatedSearches)
    localStorage.setItem("recentTagSearches", JSON.stringify(updatedSearches))
  }

  // Filter tags based on search term and filter type
  const filteredTags = availableTags.filter((tag) => {
    const matchesSearch = tag.name.toLowerCase().includes(searchTerm.toLowerCase())

    if (filterType === "all") return matchesSearch
    if (filterType === "categories") return matchesSearch && tag.is_category
    if (filterType === "tags") return matchesSearch && !tag.is_category

    return false
  })

  // Count categories and tags
  const categoriesCount = availableTags.filter((tag) => tag.is_category).length
  const tagsCount = availableTags.filter((tag) => !tag.is_category).length

  return (
    <div className="flex flex-col h-full">
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={handleInputFocus}
          className="pl-9 pr-9"
          disabled={isLoading}
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 rounded-full"
            onClick={handleClearSearch}
          >
            <span className="sr-only">Clear search</span>
            <X className="h-4 w-4" />
          </Button>
        )}

        {/* Recent searches dropdown */}
        {showRecentSearches && recentSearches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-md"
          >
            <div className="p-2 border-b">
              <div className="flex items-center text-xs text-muted-foreground">
                <History className="h-3 w-3 mr-1" />
                <span>Recent Searches</span>
              </div>
            </div>
            <ul className="p-1">
              {recentSearches.map((term, index) => (
                <li
                  key={`${term}-${index}`}
                  className="flex items-center justify-between px-2 py-1.5 hover:bg-muted rounded-sm"
                >
                  <button className="flex-1 text-left text-sm" onClick={() => handleSearch(term)}>
                    {term}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveRecentSearch(index)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>

      <Tabs
        defaultValue="all"
        value={filterType}
        onValueChange={(value) => setFilterType(value as "all" | "categories" | "tags")}
        className="mb-3"
      >
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="all" className="text-xs">
            All ({availableTags.length})
          </TabsTrigger>
          <TabsTrigger value="categories" className="text-xs">
            <Folder className="h-3 w-3 mr-1" />
            Categories ({categoriesCount})
          </TabsTrigger>
          <TabsTrigger value="tags" className="text-xs">
            <TagIcon className="h-3 w-3 mr-1" />
            Tags ({tagsCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <ScrollArea className="flex-1 pr-4">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            layout
            className="space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {filteredTags.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center p-8 text-center"
              >
                <Search className="h-8 w-8 text-muted-foreground opacity-50 mb-2" />
                <p className="text-muted-foreground">
                  {searchTerm ? `No tags found matching "${searchTerm}"` : "No tags available"}
                </p>
              </motion.div>
            ) : (
              filteredTags.map((tag) => (
                <motion.div
                  key={tag.name}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <TagItem
                    tag={tag}
                    isSelected={selectedTags.some((t) => t.name === tag.name)}
                    isPending={true}
                    onClick={() => onTagToggle(tag)}
                  />
                </motion.div>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      </ScrollArea>
    </div>
  )
}

