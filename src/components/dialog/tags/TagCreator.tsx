"use client"
import { useState, useEffect } from "react"
import type React from "react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tag, Plus, Clock, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { Separator } from "@/components/ui/separator"

interface TagCreatorProps {
  onTagCreate: (tagName: string) => void
  isLoading?: boolean
}

export function TagCreator({ onTagCreate, isLoading = false }: TagCreatorProps) {
  const [tagName, setTagName] = useState("")
  const [recentlyCreated, setRecentlyCreated] = useState<string[]>([])

  // Load recently created tags from localStorage
  useEffect(() => {
    const savedTags = localStorage.getItem("recentlyCreatedTags")
    if (savedTags) {
      setRecentlyCreated(JSON.parse(savedTags))
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (tagName.trim() && !isLoading) {
      onTagCreate(tagName.trim())

      // Add to recently created
      const updatedRecent = [tagName, ...recentlyCreated.filter((t) => t !== tagName)].slice(0, 5)
      setRecentlyCreated(updatedRecent)
      localStorage.setItem("recentlyCreatedTags", JSON.stringify(updatedRecent))

      // Clear the input
      setTagName("")
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center">
            <Tag className="h-4 w-4 mr-2 text-foreground" />
            <h3 className="text-sm font-medium">Create New Tag</h3>
          </div>

          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Input
                placeholder="Enter tag name..."
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                className="pr-10"
                disabled={isLoading}
              />
            </div>

            <Button type="submit" variant="default" size="sm" className="h-10" disabled={!tagName.trim() || isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create
            </Button>
          </div>
        </div>
      </form>

      <AnimatePresence>
        {recentlyCreated.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <Separator />

            <div className="space-y-2">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <h3 className="text-sm font-medium text-muted-foreground">Recently Created</h3>
              </div>

              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {recentlyCreated.map((tag, index) => (
                    <motion.div
                      key={`${tag}-${index}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Badge
                        variant="secondary"
                        className="px-2 py-1 cursor-pointer hover:bg-secondary/80"
                        onClick={() => setTagName(tag)}
                      >
                        <Tag className="h-3 w-3 mr-1.5" />
                        {tag}
                      </Badge>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

