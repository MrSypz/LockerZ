import React, { useState, useCallback, useEffect } from 'react'
import {Loader2, Upload, Check, Search} from 'lucide-react'
import { getCurrentWindow } from "@tauri-apps/api/window"
import { useTranslation } from 'react-i18next'
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
    const [open, setOpen] = useState(false)
    const [isDragActive, setIsDragActive] = useState(false)
    const { t } = useTranslation()

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
        <div className="flex justify-between items-center mb-8">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-[200px] justify-between"
                        disabled={isCategoriesLoading}
                    >
                        {isCategoriesLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                <Search className="mr-2 h-4 w-4" />
                                {selectedCategory || t('category.select')}
                            </>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                    <Command>
                        <CommandInput placeholder={t('category.search')} className="h-9" />
                        <CommandEmpty>{t('category.notFound')}</CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-auto">
                            <CommandItem
                                onSelect={() => {
                                    onCategoryChange("all")
                                    setOpen(false)
                                }}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedCategory === "all" ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                {t('category.allCategories')}
                            </CommandItem>
                            {categories.map((category) => (
                                <CommandItem
                                    key={category}
                                    onSelect={() => {
                                        onCategoryChange(category)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedCategory === category ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {category}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </Command>
                </PopoverContent>
            </Popover>
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

