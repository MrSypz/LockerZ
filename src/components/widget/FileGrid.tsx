"use client"

import type React from "react"
import { useCallback, useEffect, useMemo, useState, forwardRef, useImperativeHandle } from "react"
import type { File } from "@/types/file"
import { AnimatePresence } from "framer-motion"
import { useTranslation } from "react-i18next"
import { AlertCircle, Upload, Trash2, FolderInput, Tag } from "lucide-react"
import { ImageViewer } from "./Image-viewer"
import FileCard from "@/components/widget/FileCard"
import { FileSearch } from "@/components/widget/FileSearch"
import { FileSort } from "@/components/widget/FileSort"
import { useBatchProcessing } from "./BatchProcessingProvider"
import { useSharedSettings } from "@/utils/SettingsContext"
import { DragDropZone } from "@/components/widget/DragDropZone"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

type SortCriteria = "name" | "date" | "createat" | "size"
type SortOrder = "asc" | "desc"

interface SearchTerms {
    text: string
    tags: string[]
    categories: string[]
}

interface SortPreferences {
    criteria: SortCriteria
    order: SortOrder
}

// Moved outside component to avoid recreation
const getSavedSortPreferences = (): SortPreferences => {
    try {
        const saved = localStorage.getItem("fileSortPreferences")
        return saved ? JSON.parse(saved) : { criteria: "name", order: "asc" }
    } catch {
        return { criteria: "name", order: "asc" }
    }
}

const parseSearchInput = (input: string): SearchTerms => {
    const tags: string[] = []
    const categories: string[] = []
    let remainingText = input

    // Optimized regex to capture both tags and categories in one pass
    const regex = /([#@])([^#@]+?)(?=\s*[#@]|$)/g
    let match

    while ((match = regex.exec(input)) !== null) {
        const [fullMatch, prefix, content] = match
        const trimmedContent = content.trim()

        if (trimmedContent) {
            if (prefix === "#") {
                tags.push(trimmedContent.toLowerCase())
            } else {
                categories.push(trimmedContent.toLowerCase())
            }
        }
        remainingText = remainingText.replace(fullMatch, "")
    }

    return {
        text: remainingText.replace(/[#@]/g, "").trim(),
        tags,
        categories,
    }
}

function useColumnCount() {
    const [columnCount, setColumnCount] = useState(5)

    useEffect(() => {
        function updateColumnCount() {
            switch (true) {
                case window.innerWidth >= 1280:
                    setColumnCount(5)
                    break
                case window.innerWidth >= 768:
                    setColumnCount(4)
                    break
                case window.innerWidth >= 640:
                    setColumnCount(3)
                    break
                default:
                    setColumnCount(2)
            }
        }

        updateColumnCount()
        window.addEventListener("resize", updateColumnCount)
        return () => window.removeEventListener("resize", updateColumnCount)
    }, [])

    return columnCount
}

interface FileGridProps {
    allFiles: File[]
    onViewFileAction: (file: File) => void
    onDeleteFileAction: (files: File | File[]) => void
    onMoveFileAction: (files: File | File[]) => void
    onTagAction: (files: File | File[]) => void
    currentPage: number
    imagesPerPage: number
    onPageChange: (page: number) => void
    onTotalPagesChange: (pages: number) => void
}

export const FileGrid = forwardRef<{ clearSelection: () => void }, FileGridProps>(
    (
        {
            allFiles,
            onViewFileAction,
            onDeleteFileAction,
            onMoveFileAction,
            onTagAction,
            currentPage,
            imagesPerPage,
            onPageChange,
            onTotalPagesChange,
        },
        ref,
    ) => {
        const totalColumns = useColumnCount()
        const { t } = useTranslation()

        const [sortState, setSortState] = useState(() => getSavedSortPreferences())
        const [searchTerm, setSearchTerm] = useState("")
        const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
        const { settings } = useSharedSettings()
        const { optimizeImages, reset } = useBatchProcessing()
        const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())

        const handleSort = useCallback((criteria: SortCriteria, order: SortOrder) => {
            setSortState({ criteria, order })
            localStorage.setItem("fileSortPreferences", JSON.stringify({ criteria, order }))
        }, [])

        const handleSearch = useCallback(
            (event: React.ChangeEvent<HTMLInputElement>) => {
                const newSearchTerm = event.target.value
                setSearchTerm(newSearchTerm)
                if (currentPage !== 1) onPageChange(1)
            },
            [currentPage, onPageChange],
        )

        const handleSelectImage = useCallback((index: number) => {
            setSelectedImageIndex(index)
        }, [])

        const handleCloseViewer = useCallback(() => {
            setSelectedImageIndex(null)
        }, [])

        const searchTerms = useMemo(() => (searchTerm.trim() ? parseSearchInput(searchTerm) : null), [searchTerm])

        const sortedFiles = useMemo(() => {
            let filteredFiles = allFiles

            if (searchTerms) {
                const { text, tags, categories } = searchTerms
                filteredFiles = filteredFiles.filter((file) => {
                    const nameMatch = text ? file.name.toLowerCase().includes(text.toLowerCase()) : true

                    if (!tags.length && !categories.length) {
                        return nameMatch
                    }

                    const termMatches = [...tags, ...categories].every((term) => {
                        const matchesTag = file.tags?.some((fileTag) => fileTag.name.toLowerCase() === term)
                        const matchesCategory = file.category?.toLowerCase() === term

                        return matchesTag || matchesCategory
                    })

                    return nameMatch && termMatches
                })
            }

            return [...filteredFiles].sort((a, b) => {
                let comparison = 0
                switch (sortState.criteria) {
                    case "name":
                        comparison = a.name.localeCompare(b.name)
                        break
                    case "date":
                        comparison = new Date(a.last_modified).getTime() - new Date(b.last_modified).getTime()
                        break
                    case "createat":
                        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                        break
                    case "size":
                        comparison = a.size - b.size
                        break
                }
                return sortState.order === "asc" ? comparison : -comparison
            })
        }, [allFiles, searchTerms, sortState])

        const paginatedFiles = useMemo(() => {
            const start = (currentPage - 1) * imagesPerPage
            return sortedFiles.slice(start, start + imagesPerPage)
        }, [sortedFiles, currentPage, imagesPerPage])

        useEffect(() => {
            if (paginatedFiles.length > 0) {
                optimizeImages(paginatedFiles, settings.imageWidth, settings.imageHeight, settings.imageQuality).catch(
                    (error) => {
                        console.error("Failed to optimize images:", error)
                    },
                )
            }

            return () => {
                reset()
            }
        }, [paginatedFiles, settings, optimizeImages, reset])

        useEffect(() => {
            const totalPages = Math.ceil(sortedFiles.length / imagesPerPage)
            onTotalPagesChange(totalPages)

            if (currentPage > totalPages && totalPages > 0) {
                onPageChange(1)
            }
        }, [sortedFiles.length, imagesPerPage, currentPage, onTotalPagesChange, onPageChange])

        useEffect(() => {
            const handleKeyDown = (event: KeyboardEvent) => {
                if (event.ctrlKey && event.code === "Space") {
                    event.preventDefault()
                }
            }

            window.addEventListener("keydown", handleKeyDown)
            return () => window.removeEventListener("keydown", handleKeyDown)
        }, [])

        useEffect(() => {
            const handleEscapeKey = (event: KeyboardEvent) => {
                if (event.key === "Escape") {
                    if (selectedImageIndex !== null) {
                        handleCloseViewer()
                    } else if (selectedFiles.size > 0) {
                        setSelectedFiles(new Set())
                    }
                }
            }

            window.addEventListener("keydown", handleEscapeKey)
            return () => window.removeEventListener("keydown", handleEscapeKey)
        }, [selectedImageIndex, handleCloseViewer, selectedFiles])

        const searchResultCount = searchTerm ? sortedFiles.length : allFiles.length

        // File selection handlers
        const getFileKey = (file: File) => `${file.category}-${file.name}`

        const toggleFileSelection = useCallback((file: File) => {
            const fileKey = getFileKey(file)
            setSelectedFiles((prev) => {
                const newSelection = new Set(prev)
                if (newSelection.has(fileKey)) {
                    newSelection.delete(fileKey)
                } else {
                    newSelection.add(fileKey)
                }
                return newSelection
            })
        }, [])

        const selectAllFiles = useCallback(() => {
            const allKeys = paginatedFiles.map(getFileKey)
            setSelectedFiles(new Set(allKeys))
        }, [paginatedFiles])

        const clearSelection = useCallback(() => {
            setSelectedFiles(new Set())
        }, [])

        // Bulk action handlers
        const handleBulkDelete = useCallback(() => {
            const filesToDelete = paginatedFiles.filter((file) => selectedFiles.has(getFileKey(file)))
            if (filesToDelete.length > 0) {
                onDeleteFileAction(filesToDelete)
                // Don't clear selection here
            }
        }, [paginatedFiles, selectedFiles, onDeleteFileAction])

        const handleBulkMove = useCallback(() => {
            const filesToMove = paginatedFiles.filter((file) => selectedFiles.has(getFileKey(file)))
            if (filesToMove.length > 0) {
                onMoveFileAction(filesToMove)
                // Don't clear selection here
            }
        }, [paginatedFiles, selectedFiles, onMoveFileAction])

        const handleBulkTag = useCallback(() => {
            const filesToTag = paginatedFiles.filter((file) => selectedFiles.has(getFileKey(file)))
            if (filesToTag.length > 0) {
                onTagAction(filesToTag)
                // Don't clear selection here
            }
        }, [paginatedFiles, selectedFiles, onTagAction])

        useImperativeHandle(
            ref,
            () => ({
                clearSelection,
            }),
            [clearSelection],
        )

        // Selection toolbar
        const SelectionToolbar = () => {
            if (selectedFiles.size === 0) return null

            return (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-background/90 backdrop-blur-sm border border-border rounded-lg shadow-lg p-2 flex items-center gap-2"
                >
                    <span className="text-sm font-medium px-2">{t("locker.selection.count", { count: selectedFiles.size })}</span>
                    <Button variant="outline" size="sm" onClick={handleBulkTag} className="flex items-center gap-1">
                        <Tag className="h-4 w-4" />
                        {t("locker.selection.tag")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleBulkMove} className="flex items-center gap-1">
                        <FolderInput className="h-4 w-4" />
                        {t("locker.selection.move")}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkDelete}
                        className="flex items-center gap-1 text-destructive hover:bg-destructive/10"
                    >
                        <Trash2 className="h-4 w-4" />
                        {t("locker.selection.delete")}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearSelection}>
                        {t("locker.selection.clear")}
                    </Button>
                </motion.div>
            )
        }

        return (
            <div className="space-y-4">
                <div className="flex items-center space-x-4">
                    <FileSearch searchTerm={searchTerm} onSearchChange={handleSearch} files={allFiles} />
                    <FileSort sortCriteria={sortState.criteria} sortOrder={sortState.order} onSort={handleSort} />
                </div>

                {searchTerm && (
                    <div className="text-sm text-gray-500">{t("locker.search.results", { count: searchResultCount })}</div>
                )}

                <DragDropZone
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 p-4"
                    hasContent={paginatedFiles.length > 0}
                >
                    <AnimatePresence>
                        {paginatedFiles.length > 0 ? (
                            paginatedFiles.map((file, index) => (
                                <FileCard
                                    key={`${file.category}-${file.name}`}
                                    file={file}
                                    onView={() => onViewFileAction(file)}
                                    onDelete={() => onDeleteFileAction(file)}
                                    onMove={() => onMoveFileAction(file)}
                                    onSelect={() => handleSelectImage(index)}
                                    onTag={() => onTagAction(file)}
                                    index={index}
                                    column={index % totalColumns}
                                    totalColumns={totalColumns}
                                    isSelected={selectedFiles.has(getFileKey(file))}
                                    onToggleSelect={() => toggleFileSelection(file)}
                                />
                            ))
                        ) : searchTerm.trim() ? (
                            <div className="col-span-full flex flex-col items-center justify-center h-64 mt-8">
                                <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                                <p className="text-muted-foreground font-medium">{t("locker.search.no_results", { searchTerm })}</p>
                            </div>
                        ) : (
                            <div className="col-span-full flex flex-col items-center justify-center h-64">
                                <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                                <p className="text-muted-foreground font-medium">Drop images here</p>
                            </div>
                        )}
                    </AnimatePresence>
                </DragDropZone>

                {selectedImageIndex !== null && (
                    <ImageViewer files={paginatedFiles} initialIndex={selectedImageIndex} onClose={handleCloseViewer} />
                )}

                <AnimatePresence>{selectedFiles.size > 0 && <SelectionToolbar />}</AnimatePresence>
            </div>
        )
    },
)

