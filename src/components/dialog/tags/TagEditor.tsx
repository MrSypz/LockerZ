import React, { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Edit2, Trash2, Save, X } from "lucide-react"
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
import { TagInfo } from "@/hooks/use-database"

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

    const filteredTags = tags.filter(tag =>
        tag.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleEditStart = (tagName: string) => {
        setEditingTag(tagName)
        setNewTagName(tagName)
    }

    const handleEditSave = (oldName: string) => {
        if (newTagName && newTagName !== oldName) {
            onEdit(oldName, newTagName)
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
            <div className="shrink-0">
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search tags to edit..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                        disabled={isLoading}
                    />
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="space-y-2 pr-4">
                    {filteredTags.map((tag) => (
                        <div
                            key={tag.name}
                            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted group"
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
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleEditSave(tag.name)}
                                        disabled={!newTagName || newTagName === tag.name}
                                    >
                                        <Save className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={handleEditCancel}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <span className="flex-1">{tag.name}</span>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleEditStart(tag.name)}
                                        className="opacity-0 group-hover:opacity-100"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => setDeleteConfirmTag(tag.name)}
                                        className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>

            <AlertDialog
                open={!!deleteConfirmTag}
                onOpenChange={() => setDeleteConfirmTag(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Tag</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the tag "{deleteConfirmTag}"?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (deleteConfirmTag) {
                                    onDelete(deleteConfirmTag)
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