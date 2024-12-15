import React, { useState, useCallback, useEffect } from 'react'
import { Upload, Loader2, Search } from 'lucide-react'
import { getCurrentWindow } from "@tauri-apps/api/window"
import { useTranslation } from 'react-i18next'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface CategorySelectorProps {
    selectedCategory: string;
    categories: string[];
    isCategoriesLoading: boolean;
    onCategoryChange: (category: string) => void;
    uploadImgFiles: (droppedFiles?: string[]) => Promise<void>;
}

export function CategorySelector({
                                     selectedCategory,
                                     categories,
                                     isCategoriesLoading,
                                     onCategoryChange,
                                     uploadImgFiles
                                 }: CategorySelectorProps) {
    const [isDragActive, setIsDragActive] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const { t } = useTranslation()

    const filteredCategories = categories.filter(category =>
        category.toLowerCase().includes(searchTerm.toLowerCase())
    )

    useEffect(() => {
        let isMounted = true
        let unlistenFunction: (() => void) | undefined

        const setupDragDropListener = async () => {
            if (!isMounted) return

            unlistenFunction = await getCurrentWindow().onDragDropEvent((event) => {
                if (!isMounted) return

                if (event.payload.type === 'over') {
                    setIsDragActive(true)
                } else if (event.payload.type === 'drop') {
                    uploadImgFiles(event.payload.paths)
                    setIsDragActive(false)
                } else {
                    setIsDragActive(false)
                }
            })
        }

        setupDragDropListener()

        return () => {
            isMounted = false
            if (unlistenFunction) {
                unlistenFunction()
            }
        }
    }, [uploadImgFiles])

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragActive(true)
    }

    const handleDragLeave = () => {
        setIsDragActive(false)
    }

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragActive(false)
    }

    const handleClick = useCallback(() => {
        uploadImgFiles()
    }, [uploadImgFiles])

    return (
        <div className="flex justify-between items-start mb-8">
            <div className="w-[300px] space-y-2">
                <div className="relative">
                    <Input
                        type="text"
                        placeholder={t('category.search')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"/>
                </div>
                {isCategoriesLoading ? (
                    <Button variant="outline" className="w-full justify-start" disabled>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('category.loading')}
                    </Button>
                ) : (
                    <select
                        value={selectedCategory}
                        onChange={(e) => onCategoryChange(e.target.value)}
                        className={cn(
                            "w-full px-3 py-2 text-sm",
                            "bg-background border border-input",
                            "rounded-md shadow-sm",
                            "focus:outline-none focus:ring-2 focus:ring-ring focus:border-input"
                        )}
                    >
                        <option value="all">{t('category.allCategories')}</option>
                        {filteredCategories.map((category) => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}
                    </select>
                )}
                {searchTerm && filteredCategories.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t('category.noResults')}</p>
                )}
            </div>
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
                className={`p-6 border-2 border-dashed rounded-lg transition-all duration-300 ease-in-out
                    ${isDragActive ? 'border-primary bg-primary/50' : 'border-border hover:border-primary/50'}
                    cursor-pointer bg-card text-card-foreground hover:scale-95`}
            >
                <div className="flex flex-col items-center space-y-2">
                    <Upload className="h-10 w-10" />
                    <p
                        className="text-center text-sm font-medium leading-5 max-w-[150px] truncate"
                        title={isDragActive ? t('category.dragdrop.idle') : t('category.dragdrop.hover')}
                    >
                        {isDragActive ? t('category.dragdrop.idle') : t('category.dragdrop.hover')}
                    </p>
                </div>
            </div>
        </div>
    )
}

