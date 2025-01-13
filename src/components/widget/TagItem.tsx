import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Check, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { OptimizedImage } from "@/components/widget/ImageProcessor"
import { DatabaseService, Image } from "@/hooks/use-database"

interface TagItemProps {
  tag: string
  onRemove: (tag: string) => void
  onRename: (oldTag: string, newTag: string) => void
  onDelete: (tag: string) => void
  isSelected?: boolean
  onSelect?: (tag: string, isSelected: boolean) => void
  selectable?: boolean
  imagewidth?: number
  imageheigh?: number
  imagequality?: number
}

const MotionBadge = motion(Badge)

export function TagItem({
                          tag,
                          onRemove,
                          onRename,
                          onDelete,
                          isSelected = false,
                          onSelect,
                          selectable = false,
                          imagewidth,
                          imageheigh,
                          imagequality
                        }: TagItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [newTagName, setNewTagName] = useState(tag)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [taggedImages, setTaggedImages] = useState<Image[]>([])
  const db = new DatabaseService()

  useEffect(() => {
    const fetchImagesWithTag = async () => {
      if (showDeleteDialog) {
        try {
          const images = await db.searchImagesByTags([tag])
          setTaggedImages(images)
        } catch (error) {
          console.error('Failed to fetch images with tag:', error)
        }
      }
    }

    fetchImagesWithTag()
  }, [showDeleteDialog, tag])

  const handleRename = () => {
    if (newTagName.trim() && newTagName !== tag) {
      onRename(tag, newTagName.trim())
    }
    setIsEditing(false)
  }

  const handleDeleteConfirm = () => {
    onDelete(tag)
    setShowDeleteDialog(false)
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (selectable && onSelect) {
      onSelect(tag, !isSelected)
    } else if (!selectable) {
      onRemove(tag)
    }
  }

  return (
      <>
        <ContextMenu>
          <ContextMenuTrigger>
            <motion.div
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                transition={{ duration: 0.2 }}
            >
              <MotionBadge
                  variant={isSelected ? "default" : "secondary"}
                  className={`
                cursor-pointer group py-1 px-2 flex items-center justify-between w-full
                transition-all duration-200 ease-in-out
                ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-primary/20'}
              `}
                  onClick={handleClick}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
              >
                <span className="truncate flex-grow" title={tag}>{tag}</span>
                {isSelected && (
                    <Check className="h-4 w-4 ml-2 flex-shrink-0" />
                )}
              </MotionBadge>
            </motion.div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onSelect={() => setIsEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Rename
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => setShowDeleteDialog(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Delete Tag "{tag}"
              </AlertDialogTitle>
              <div className="mt-4">
                <AlertDialogDescription asChild>
                  <div>
                    Are you sure you want to delete this tag? This action cannot be undone.

                    {taggedImages.length > 0 && (
                        <div className="mt-4">
                          <div className="font-medium mb-2">
                            This tag is used in {taggedImages.length} images:
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {taggedImages.slice(0, 4).map((image) => (
                                <div key={image.id} className="relative w-full pt-[100%]">
                                  <div className="absolute inset-0">
                                    <OptimizedImage
                                        src={image.relative_path +"\\" +  image.filename}
                                        alt={`Image with tag ${tag}`}
                                        width={imagewidth}
                                        height={imageheigh}
                                        quality={imagequality}
                                    />
                                  </div>
                                </div>
                            ))}
                          </div>
                          {taggedImages.length > 4 && (
                              <div className="text-sm text-muted-foreground mt-2">
                                And {taggedImages.length - 4} more...
                              </div>
                          )}
                        </div>
                    )}
                  </div>
                </AlertDialogDescription>
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                  onClick={handleDeleteConfirm}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Tag
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Rename Sheet */}
        <Sheet open={isEditing} onOpenChange={setIsEditing}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Rename Tag</SheetTitle>
              <SheetDescription>
                Enter a new name for the tag "{tag}".
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newTagName" className="text-right">
                  New Name
                </Label>
                <Input
                    id="newTagName"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    className="col-span-3"
                />
              </div>
            </div>
            <div className="flex flex-col gap-4 mt-4">
              <Button onClick={handleRename}>Save</Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </>
  )
}