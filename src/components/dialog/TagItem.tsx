import React from "react"
import { Button } from "@/components/ui/button"
import { Check, Tag as TagIcon, Folder, Plus, ArrowRight } from "lucide-react"
import { TagInfo } from "@/hooks/use-database"
import { cn } from "@/lib/utils"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface TagItemProps {
    tag: TagInfo
    isSelected: boolean
    isPending?: boolean
    onClick: () => void
}

export function TagItem({ tag, isSelected, isPending = false, onClick }: TagItemProps) {
    const Icon = tag.is_category ? Folder : TagIcon

    const getButtonStyles = () => {
        if (tag.is_category) {
            return isSelected
                ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-600"
                : "border-blue-300 hover:border-blue-400 text-blue-600 hover:text-blue-700"
        }

        if (isSelected) {
            return isPending
                ? "bg-muted hover:bg-muted/80 border-muted-foreground/20"
                : "bg-primary hover:bg-primary/90"
        }

        return "hover:bg-muted/50"
    }

    const StatusIcon = isSelected ? Check : Plus

    const getTooltipContent = () => {
        if (isSelected && isPending) return "Click to remove (pending)"
        if (isSelected) return "Currently applied"
        return "Click to add"
    }

    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                            "w-full justify-between group transition-all duration-200",
                            "relative overflow-hidden",
                            getButtonStyles(),
                            isPending && "border-dashed"
                        )}
                        onClick={onClick}
                    >
                        <div className="flex items-center overflow-hidden">
                            <Icon className={cn(
                                "h-4 w-4 mr-2 flex-shrink-0",
                                tag.is_category ? "text-blue-500" : "text-muted-foreground",
                                isSelected && "text-current"
                            )} />
                            <span className="truncate">{tag.name}</span>
                        </div>

                        <div className="flex items-center gap-1">
                            {isPending && (
                                <ArrowRight className="h-3 w-3 text-muted-foreground animate-pulse" />
                            )}
                            <StatusIcon className={cn(
                                "h-4 w-4 transition-all duration-200",
                                isPending ? "text-muted-foreground" : "text-current",
                                !isSelected && "opacity-0 group-hover:opacity-100"
                            )} />
                        </div>

                        {/* Selection indicator */}
                        {isSelected && !isPending && (
                            <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
                        )}

                        {/* Pending indicator */}
                        {isPending && (
                            <div className="absolute inset-0 bg-background/5 pointer-events-none" />
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                    <p>{getTooltipContent()}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}