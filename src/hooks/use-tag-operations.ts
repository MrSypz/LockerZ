"use client"

import { useToast } from "@/hooks/use-toast"
import { DatabaseService } from "@/hooks/use-database"

export function useTagOperations(onRefresh: () => Promise<void>) {
    const { toast } = useToast()
    const db = new DatabaseService()

    const handleTagCreate = async (tagName: string) => {
        try {
            await db.addTag(tagName)
            await onRefresh()
            toast({ title: "Tag created", description: `"${tagName}" created.` })
        } catch (error) {
            toast({ title: "Error creating tag", description: String(error), variant: "destructive" })
        }
    }

    const handleTagEdit = async (oldName: string, newName: string) => {
        try {
            await db.editTag(oldName, newName)
            await onRefresh()
            toast({ title: "Tag updated", description: `"${oldName}" renamed to "${newName}".` })
        } catch (error) {
            toast({ title: "Error updating tag", description: String(error), variant: "destructive" })
        }
    }

    const handleTagDelete = async (tagName: string) => {
        try {
            await db.deleteTag(tagName)
            await onRefresh()
            toast({ title: "Tag deleted", description: `"${tagName}" deleted.` })
        } catch (error) {
            toast({ title: "Error deleting tag", description: String(error), variant: "destructive" })
        }
    }

    return { handleTagCreate, handleTagEdit, handleTagDelete, db }
}
