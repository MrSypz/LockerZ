import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Check, Pencil, Trash2 } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface TagItemProps {
  tag: string
  onRemove: (tag: string) => void
  onRename: (oldTag: string, newTag: string) => void
  onDelete: (tag: string) => void
  isSelected?: boolean
  onSelect?: (tag: string, isSelected: boolean) => void
  selectable?: boolean
}

const MotionBadge = motion(Badge)

export function TagItem({ tag, onRemove, onRename, onDelete, isSelected = false, onSelect, selectable = false }: TagItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [newTagName, setNewTagName] = useState(tag)

  const handleRename = () => {
    if (newTagName.trim() && newTagName !== tag) {
      onRename(tag, newTagName.trim())
    }
    setIsEditing(false)
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
            <ContextMenuItem onSelect={() => onDelete(tag)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

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