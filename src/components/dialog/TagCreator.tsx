import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TagCreatorProps {
    onTagCreate: (tagName: string) => void
    isLoading?: boolean
}

export function TagCreator({ onTagCreate, isLoading = false }: TagCreatorProps) {
    const [tagName, setTagName] = useState("")

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (tagName.trim() && !isLoading) {
            onTagCreate(tagName.trim())
            setTagName("")
        }
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="shrink-0">
                <form onSubmit={handleSubmit} className="space-y-2">
                    <Input
                        placeholder="Enter new tag name..."
                        value={tagName}
                        onChange={(e) => setTagName(e.target.value)}
                        disabled={isLoading}
                    />
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading || !tagName.trim()}
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Plus className="h-4 w-4 mr-2" />
                        )}
                        Create Tag
                    </Button>
                </form>
            </div>
            <div className="flex-1 min-h-0">
                <ScrollArea className="h-full">
                    <div className="space-y-2 pr-4">
                        {/* Additional content can go here */}
                    </div>
                </ScrollArea>
            </div>
        </div>
    )
}