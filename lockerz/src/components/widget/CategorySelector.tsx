"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Upload } from 'lucide-react'
import { getCurrentWindow } from "@tauri-apps/api/window"
import { useTranslation } from 'react-i18next'

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {Category} from "@/types/file";

interface CategorySelectorProps {
    selectedCategory: string;
    categories: Category[];
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
    const [open, setOpen] = React.useState(false)
    const [isDragActive, setIsDragActive] = React.useState(false)
    const { t } = useTranslation()

    React.useEffect(() => {
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

    const handleClick = React.useCallback(() => {
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
                        className={cn(
                            "w-[200px] justify-between",
                            "bg-white dark:bg-gray-800",
                            "hover:bg-gray-100 dark:hover:bg-gray-700",
                            "focus:ring-2 focus:ring-blue-500 focus:outline-none",
                            "transition-colors duration-200"
                        )}
                        disabled={isCategoriesLoading}
                    >
                        <span className="truncate">
                            {selectedCategory
                                ? categories.find((category) => category === selectedCategory) || t('category.allCategories')
                                : t('category.allCategories')}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                    <Command className="rounded-lg border shadow-md">
                        <CommandInput placeholder={t('category.search')} className="h-9" />
                        <CommandEmpty className="py-2 text-center text-sm text-gray-500">
                            {t('category.notFound')}
                        </CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-y-auto">
                            <CommandItem
                                onSelect={() => {
                                    onCategoryChange("all")
                                    setOpen(false)
                                }}
                                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedCategory === "all" ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                <span>{t('category.allCategories')}</span>
                            </CommandItem>
                            {categories.map((category) => (
                                <CommandItem
                                    key={category}
                                    onSelect={() => {
                                        onCategoryChange(category)
                                        setOpen(false)
                                    }}
                                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedCategory === category ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <span>{category}</span>
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
                className={cn(
                    "p-6 border-2 border-dashed rounded-lg",
                    "transition-all duration-300 ease-in-out",
                    "cursor-pointer",
                    "flex flex-col items-center justify-center space-y-2",
                    "bg-white dark:bg-gray-800",
                    "hover:bg-gray-100 dark:hover:bg-gray-700",
                    isDragActive
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500"
                )}
            >
                <Upload className="h-10 w-10 text-gray-400" />
                <p
                    className="text-center text-sm font-medium leading-5 max-w-[150px] truncate text-gray-600 dark:text-gray-300"
                    title={isDragActive ? t('category.dragdrop.idle') : t('category.dragdrop.hover')}
                >
                    {isDragActive ? t('category.dragdrop.idle') : t('category.dragdrop.hover')}
                </p>
            </div>
        </div>
    )
}

