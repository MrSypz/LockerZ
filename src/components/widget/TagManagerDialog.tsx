import React, { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { ImagePanel } from "@/components/dialog/ImagePanel"
import { TagPanel } from "@/components/dialog/TagPanel"
import { DatabaseService } from "@/hooks/use-database"
import { useToast } from "@/hooks/use-toast"
import { Tag } from "lucide-react"
import { File } from "@/types/file"

interface TagManagerDialogProps {
    file: File
    isOpen: boolean
    onClose: () => void
}

export function TagManagerDialog({ file, isOpen, onClose }: TagManagerDialogProps) {
    const { toast } = useToast()
    const [imageId, setImageId] = useState<number | null>(null)
    const db = new DatabaseService()

    useEffect(() => {
        const initializeImage = async () => {
            if (!isOpen) return
            try {
                const id = await db.addImage(file.filepath, file.category)
                setImageId(id)
            } catch (error) {
                toast({
                    title: "Error initializing image",
                    description: String(error),
                    variant: "destructive"
                })
            }
        }

        initializeImage()
    }, [file, isOpen])

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl h-[80vh] flex flex-col overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Tag className="h-5 w-5" />
                        Tag Manager
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
                    <div className="h-full overflow-hidden">
                        <ImagePanel file={file} />
                    </div>

                    <div className="md:col-span-2 h-full overflow-hidden">
                        {imageId && <TagPanel imageId={imageId} />}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}