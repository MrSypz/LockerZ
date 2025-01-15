import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Check, Pencil, Trash2, AlertTriangle, TagIcon, FolderIcon } from 'lucide-react'
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
import {DatabaseService, Image, TagInfo} from "@/hooks/use-database"

interface TagItemProps {
  tag: TagInfo;
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
  const [newTagName, setNewTagName] = useState(tag.name);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [taggedImages, setTaggedImages] = useState<Image[]>([])
  const db = new DatabaseService()

  useEffect(() => {
    const fetchImagesWithTag = async () => {
      if (showDeleteDialog) {
        try {
          const images = await db.searchImagesByTags([tag.name]);
          setTaggedImages(images);
        } catch (error) {
          console.error('Failed to fetch images with tag:', error);
        }
      }
    };

    fetchImagesWithTag();
  }, [showDeleteDialog, tag.name]);

  const handleRename = () => {
    if (newTagName.trim() && newTagName !== tag.name) {
      onRename(tag.name, newTagName.trim());
    }
    setIsEditing(false);
  };

  const handleDeleteConfirm = () => {
    onDelete(tag.name);
    setShowDeleteDialog(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (selectable && onSelect) {
      onSelect(tag.name, !isSelected);
    } else if (!selectable) {
      onRemove(tag.name);
    }
  };

  const getBadgeVariant = () => {
    if (isSelected) return "default";
    if (tag.is_category) return "secondary";
    return "outline";
  };

  const getBadgeStyles = () => {
    if (tag.is_category) {
      return "bg-blue-500 hover:bg-blue-600 text-white";
    }
    return "";
  };

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
                  variant={getBadgeVariant()}
                  className={`
                cursor-pointer group py-2 px-3 flex items-center justify-between w-full
                transition-all duration-200 ease-in-out rounded-md
                ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-primary/10'}
                ${getBadgeStyles()}
              `}
                  onClick={handleClick}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
              >
              <span className="truncate flex-grow flex items-center" title={tag.name}>
                {tag.is_category ? <FolderIcon className="h-4 w-4 mr-2 flex-shrink-0" /> : <TagIcon className="h-4 w-4 mr-2 flex-shrink-0" />}
                {tag.name}
              </span>
                {isSelected && <Check className="h-4 w-4 ml-2 flex-shrink-0" />}
              </MotionBadge>
            </motion.div>
          </ContextMenuTrigger>

          <ContextMenuContent>
            {!tag.is_category && (
                <ContextMenuItem onSelect={() => setIsEditing(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Rename
                </ContextMenuItem>
            )}
            {!tag.is_category && (
                <ContextMenuItem onSelect={() => setShowDeleteDialog(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </ContextMenuItem>
            )}
          </ContextMenuContent>
        </ContextMenu>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Delete Tag "{tag.name}"
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Are you sure you want to delete this tag? This action cannot be undone.
                  </div>
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
                                      src={image.relative_path + "\\" + image.filename}
                                      alt={`Image with tag ${tag.name}`}
                                      width={imagewidth ?? 400}
                                      height={imageheigh ?? 560}
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

        <Sheet open={isEditing} onOpenChange={setIsEditing}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Rename Tag</SheetTitle>
              <SheetDescription>
                Enter a new name for the tag "{tag.name}".
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleRename(); }} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="newTagName">New Name</Label>
                <Input
                    id="newTagName"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          </SheetContent>
        </Sheet>
      </>
  )
}

