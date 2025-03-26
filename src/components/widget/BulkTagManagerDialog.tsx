"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MultiImagePanel } from "@/components/dialog/tags/MultiImagePanel"
import { BulkTagPanel } from "@/components/dialog/tags/BulkTagPanel"
import { DatabaseService } from "@/hooks/use-database"
import { useToast } from "@/hooks/use-toast"
import { Tag } from "lucide-react"
import type { File } from "@/types/file"

interface BulkTagManagerDialogProps {
    files: File[]
    isOpen: boolean
    onClose: () => void
}

export function BulkTagManagerDialog({ files, isOpen, onClose }: BulkTagManagerDialogProps) {
    const { toast } = useToast()
    const [imageIds, setImageIds] = useState<number[]>([])
    const [isInitializing, setIsInitializing] = useState(true)
    const db = new DatabaseService()

    useEffect(() => {
        const initializeImages = async () => {
            if (!isOpen) return

            setIsInitializing(true)
            try {
                // Initialize all images and get their IDs
                const ids = await Promise.all(
                    files.map(async (file) => {
                        try {
                            return await db.addImage(file.filepath, file.category)
                        } catch (error) {
                            // If the image already exists, get its ID
                            return await db.getImageId(file.filepath, file.category)
                        }
                    }),
                )

                setImageIds(ids.filter((id) => id !== null && id !== undefined) as number[])
            } catch (error) {
                toast({
                    title: "Error initializing images",
                    description: String(error),
                    variant: "destructive",
                })
            } finally {
                setIsInitializing(false)
            }
        }

        if (isOpen && files.length > 0) {
            initializeImages()
        }
    }, [files, isOpen])

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl h-[80vh] flex flex-col overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Tag className="h-5 w-5" />
                        Bulk Tag Manager ({files.length} images)
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
                    <div className="h-full overflow-hidden">
                        <MultiImagePanel files={files} />
                    </div>

                    <div className="md:col-span-2 h-full overflow-hidden">
                        {!isInitializing && imageIds.length > 0 && <BulkTagPanel imageIds={imageIds} onComplete={onClose} />}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

