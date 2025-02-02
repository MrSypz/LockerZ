'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog"
import { CategoryCard } from "@/components/widget/CategoryCard"
import { FolderPlus, FolderOpen, Search } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "react-i18next"
import { invoke } from '@tauri-apps/api/core'
import { AnimatePresence } from "framer-motion"

interface Category {
    name: string
    file_count: number
    size: number
}

export default function CategoryPage() {
    const [categories, setCategories] = useState<Category[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [newCategory, setNewCategory] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const { toast } = useToast()
    const { t } = useTranslation()

    useEffect(() => {
        fetchCategories()
    }, [])

    const fetchCategories = async () => {
        try {
            setIsLoading(true)
            const data = await invoke<Category[]>("get_categories")
            setCategories(data)
        } catch (error) {
            console.error("Error fetching categories:", error)
            toast({
                title: t('error.title'),
                description: t('categories.error.fetch'),
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleRename = async (oldName: string, newName: string) => {
        if (oldName === newName) return

        try {
            await invoke('rename_category', {
                oldName,
                newName
            })
            await fetchCategories()
            toast({
                title: t('success.title'),
                description: t('categories.success.rename'),
            })
        } catch (error: any) {
            const errorMessage = error?.message || t('categories.error.rename')
            toast({
                title: t('error.title'),
                description: errorMessage,
                variant: "destructive",
            })
        }
    }

    const handleDelete = async (categoryName: string) => {
        try {
            await invoke('delete_category', { name: categoryName })
            await fetchCategories()
            toast({
                title: t('success.title'),
                description: t('categories.success.delete'),
            })
        } catch (error: any) {
            const errorMessage = error?.message || ""
            if (errorMessage.includes("not empty")) {
                toast({
                    title: t('warning.title'),
                    description: t('categories.warning.notEmpty', { category: categoryName }),
                    variant: "destructive",
                })
            } else {
                toast({
                    title: t('error.title'),
                    description: t('categories.error.delete'),
                    variant: "destructive",
                })
            }
        }
    }

    const handleCreateCategory = async () => {
        const trimmedName = newCategory.trim()
        if (!trimmedName) {
            toast({
                title: t('error.title'),
                description: t('categories.error.emptyName'),
                variant: "destructive",
            })
            return
        }

        try {
            await invoke("create_category", { name: trimmedName })
            setNewCategory('')
            setIsCreateDialogOpen(false)
            await fetchCategories()
            toast({
                title: t('success.title'),
                description: t('categories.success.create'),
            })
        } catch (error) {
            console.error('Error creating category:', error)
            toast({
                title: t('error.title'),
                description: t('categories.error.create'),
                variant: "destructive",
            })
        }
    }

    const filteredCategories = categories.filter(category =>
        category.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="flex h-screen">
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto p-6">
                    {/* Header Section */}
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold gradient-text-header">
                            {t('categories.page.head')}
                        </h1>
                        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <FolderPlus className="mr-2 h-4 w-4"/>
                                    {t('categories.page.createcat')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{t('categories.page.dialog.title')}</DialogTitle>
                                    <DialogDescription>
                                        {t('categories.page.dialog.desc')}
                                    </DialogDescription>
                                </DialogHeader>
                                <Input
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    placeholder={t('categories.page.dialog.input')}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleCreateCategory()
                                        }
                                    }}
                                />
                                <DialogFooter>
                                    <Button onClick={handleCreateCategory}>
                                        {t('categories.page.dialog.action')}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Search Bar */}
                    <div className="mb-6 flex items-center space-x-2">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('categories.page.search')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>

                    {/* Loading State */}
                    {isLoading ? (
                        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        </div>
                    ) : filteredCategories.length === 0 ? (
                        // Empty State
                        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
                            <FolderOpen className="h-24 w-24 text-muted-foreground mb-4"/>
                            <p className="text-xl text-muted-foreground">
                                {categories.length === 0
                                    ? t('categories.empty.noCategories')
                                    : t('categories.empty.noResults')}
                            </p>
                        </div>
                    ) : (
                        // Categories Grid
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <AnimatePresence>
                                {filteredCategories.map((category) => (
                                    <CategoryCard
                                        key={category.name}
                                        category={category}
                                        onRename={handleRename}
                                        onDelete={handleDelete}
                                        onRefresh={fetchCategories}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}