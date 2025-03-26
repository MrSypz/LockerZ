"use client"
import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Edit2, Trash2, Save, X, Tag, AlertTriangle } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import type { TagInfo } from "@/hooks/use-database"

interface TagEditorProps {
  tags: TagInfo[]
  onEdit: (oldName: string, newName: string) => void
  onDelete: (tagName: string) => void
  isLoading?: boolean
}

export function TagEditor({ tags, onEdit, onDelete, isLoading = false }: TagEditorProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [newTagName, setNewTagName] = useState("")
  const [deleteConfirmTag, setDeleteConfirmTag] = useState<string | null>(null)
  const [recentlyModified, setRecentlyModified] = useState<string[]>([])

  // Filter out category tags and apply search filter
  const filteredTags = tags
    .filter((tag) => !tag.is_category) // Only show user-created tags, not categories
    .filter((tag) => tag.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const handleEditStart = (tagName: string) => {
    setEditingTag(tagName)
    setNewTagName(tagName)
  }

  const handleEditSave = (oldName: string) => {
    if (newTagName && newTagName !== oldName) {
      onEdit(oldName, newTagName)

      // Add to recently modified
      setRecentlyModified((prev) => [oldName, ...prev].slice(0, 5))
    }
    setEditingTag(null)
    setNewTagName("")
  }

  const handleEditCancel = () => {
    setEditingTag(null)
    setNewTagName("")
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="shrink-0 space-y-3">
        <div className="flex items-center mb-2">
          <Tag className="h-4 w-4 mr-2 text-emerald-500" />
          <h3 className="text-sm font-medium">Manage User Tags</h3>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tags to edit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-9"
            disabled={isLoading}
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 rounded-full"
              onClick={() => setSearchTerm("")}
            >
              <span className="sr-only">Clear search</span>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {recentlyModified.length > 0 && (
        <div className="shrink-0">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Recently Modified</h4>
          <div className="flex flex-wrap gap-2">
            {recentlyModified.map((tag, index) => (
              <Badge key={`${tag}-${index}`} variant="secondary" className="px-2 py-1 text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="space-y-1 pr-4">
          <AnimatePresence initial={false} mode="popLayout">
            {filteredTags.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center p-8 text-center"
              >
                <Tag className="h-8 w-8 text-muted-foreground opacity-50 mb-2" />
                <p className="text-muted-foreground">
                  {searchTerm ? `No tags found matching "${searchTerm}"` : "No user tags available to edit"}
                </p>
                <p className="text-xs text-muted-foreground mt-2">Note: Category tags cannot be edited</p>
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
                  className="flex items-center gap-2 p-3 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/20 group border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800/50"
                >
                  {editingTag === tag.name ? (
                    <>
                      <Input
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        className="flex-1"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditSave(tag.name)}
                        disabled={!newTagName || newTagName === tag.name}
                        className="h-8 w-8 p-0"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleEditCancel} className="h-8 w-8 p-0">
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full flex-shrink-0 bg-emerald-500" />
                      <span className="flex-1 font-medium">{tag.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditStart(tag.name)}
                        className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteConfirmTag(tag.name)}
                        className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      <AlertDialog open={!!deleteConfirmTag} onOpenChange={() => setDeleteConfirmTag(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Tag
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the tag "{deleteConfirmTag}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmTag) {
                  onDelete(deleteConfirmTag)

                  // Add to recently modified
                  setRecentlyModified((prev) => [deleteConfirmTag, ...prev].slice(0, 5))

                  setDeleteConfirmTag(null)
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

