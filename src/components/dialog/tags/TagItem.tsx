"use client"
import { motion } from "framer-motion"
import { Tag, Folder, X, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { TagInfo } from "@/hooks/use-database"

interface TagItemProps {
  tag: TagInfo
  isSelected?: boolean
  onClick: () => void
  showControls?: boolean
}

export function TagItem({ tag, isSelected = false, onClick, showControls = true }: TagItemProps) {
  // Determine the appropriate icon based on tag type
  const Icon = tag.is_category ? Folder : Tag

  // Get appropriate styles based on tag type and selection state
  const getStyles = () => {
    if (tag.is_category) {
      return {
        container: cn(
          "border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/30",
          isSelected ? "ring-2 ring-blue-400 dark:ring-blue-600" : "",
          "hover:bg-blue-100 dark:hover:bg-blue-900/30",
        ),
        icon: "text-blue-600 dark:text-blue-400",
        text: "text-blue-800 dark:text-blue-300",
        badge: "bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200",
      }
    } else {
      return {
        container: cn(
          "border-l-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
          isSelected ? "ring-2 ring-emerald-400 dark:ring-emerald-600" : "",
          "hover:bg-emerald-100 dark:hover:bg-emerald-900/30",
        ),
        icon: "text-emerald-600 dark:text-emerald-400",
        text: "text-emerald-800 dark:text-emerald-300",
        badge: "bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200",
      }
    }
  }

  const styles = getStyles()

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            className={cn(
              "group relative flex items-center p-3 rounded-md mb-2 cursor-pointer transition-all",
              styles.container,
            )}
            onClick={onClick}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex-1 flex items-center min-w-0">
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full mr-3",
                  tag.is_category ? "bg-blue-100 dark:bg-blue-900/50" : "bg-emerald-100 dark:bg-emerald-900/50",
                )}
              >
                <Icon className={cn("h-4 w-4", styles.icon)} />
              </div>

              <div className="min-w-0">
                <p className={cn("font-medium truncate", styles.text)}>{tag.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {tag.is_category ? "Category" : "Tag"}
                  {tag.count !== undefined && ` • ${tag.count} items`}
                </p>
              </div>
            </div>

            {showControls && (
              <div className="flex items-center ml-2">
                {isSelected ? (
                  <div
                    className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center",
                      "bg-primary text-primary-foreground",
                    )}
                  >
                    <X className="h-3 w-3" />
                  </div>
                ) : (
                  <div
                    className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                      "bg-background/80 backdrop-blur-sm border border-input",
                    )}
                  >
                    <Plus className="h-3 w-3" />
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>{isSelected ? "Click to remove" : "Click to add"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

