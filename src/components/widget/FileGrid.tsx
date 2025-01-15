import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { File } from '@/types/file'
import { motion, AnimatePresence } from "framer-motion"
import { useTranslation } from 'react-i18next'
import { AlertCircle } from 'lucide-react'
import { ImageViewer } from './Image-viewer'
import { FileCard } from "@/components/widget/FileCard"
import { FileSearch } from "@/components/widget/FileSearch"
import { FileSort } from "@/components/widget/FileSort"

type SortCriteria = 'name' | 'date' | 'createat' | 'size'
type SortOrder = 'asc' | 'desc'

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
        const saved = localStorage.getItem('fileSortPreferences')
        return saved ? JSON.parse(saved) : { criteria: 'name', order: 'asc' }
    } catch {
        return { criteria: 'name', order: 'asc' }
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
            if (prefix === '#') {
                tags.push(trimmedContent.toLowerCase())
            } else {
                categories.push(trimmedContent.toLowerCase())
            }
        }
        remainingText = remainingText.replace(fullMatch, '')
    }

    return {
        text: remainingText.replace(/[#@]/g, '').trim(),
        tags,
        categories
    }
}

function useColumnCount() {
    const [columnCount, setColumnCount] = useState(5)

    useEffect(() => {
        function updateColumnCount() {
            switch (true) {
                case window.innerWidth >= 1280:
                    setColumnCount(5);
                    break;
                case window.innerWidth >= 768:
                    setColumnCount(4);
                    break;
                case window.innerWidth >= 640:
                    setColumnCount(3);
                    break;
                default:
                    setColumnCount(2);
            }
        }

        updateColumnCount()
        window.addEventListener('resize', updateColumnCount)
        return () => window.removeEventListener('resize', updateColumnCount)
    }, [])

    return columnCount
}

interface FileGridProps {
    files: File[]
    allFiles: File[]
    onViewFileAction: (file: File) => void
    onDeleteFileAction: (file: File) => void
    onMoveFileAction: (file: File) => void
    onTagAction: (file: File) => void
    currentPage: number
    imagesPerPage: number
    onPageChange: (page: number) => void
    onTotalPagesChange: (pages: number) => void
}

export function FileGrid({
                             files,
                             allFiles,
                             onViewFileAction,
                             onDeleteFileAction,
                             onMoveFileAction,
                             onTagAction,
                             currentPage,
                             imagesPerPage,
                             onPageChange,
                             onTotalPagesChange
                         }: FileGridProps) {
    const totalColumns = useColumnCount()
    const { t } = useTranslation()
    const savedPreferences = useMemo(() => getSavedSortPreferences(), [])

    const [sortCriteria, setSortCriteria] = useState<SortCriteria>(savedPreferences.criteria)
    const [sortOrder, setSortOrder] = useState<SortOrder>(savedPreferences.order)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)

    const handleSort = useCallback((criteria: SortCriteria, order: SortOrder) => {
        setSortCriteria(criteria)
        setSortOrder(order)
        localStorage.setItem('fileSortPreferences', JSON.stringify({ criteria, order }))
    }, [])

    const handleSearch = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const newSearchTerm = event.target.value
        setSearchTerm(newSearchTerm)
        if (currentPage !== 1) {
            onPageChange(1)
        }
    }, [currentPage, onPageChange])

    const handleSelectImage = useCallback((index: number) => {
        setSelectedImageIndex(index)
    }, [])

    const handleCloseViewer = useCallback(() => {
        setSelectedImageIndex(null)
    }, [])

    // Memoize search terms parsing
    const searchTerms = useMemo(() =>
            searchTerm.trim() ? parseSearchInput(searchTerm) : null
        , [searchTerm])

    // Memoize filtered and sorted files
    const sortedFiles = useMemo(() => {
        let filteredFiles = allFiles

        if (searchTerms) {
            const { text, tags, categories } = searchTerms
            filteredFiles = filteredFiles.filter(file => {
                // Text match
                const nameMatch = text ?
                    file.name.toLowerCase().includes(text.toLowerCase()) :
                    true

                // If no tags or categories specified, only use text match
                if (!tags.length && !categories.length) {
                    return nameMatch
                }

                // Combined tag and category matches
                const termMatches = [...tags, ...categories].every(term => {
                    const matchesTag = file.tags?.some(fileTag =>
                        fileTag.name.toLowerCase() === term
                    )
                    const matchesCategory = file.category?.toLowerCase() === term

                    return matchesTag || matchesCategory
                })

                return nameMatch && termMatches
            })
        }

        // Sort files
        return filteredFiles.sort((a, b) => {
            let comparison = 0
            switch (sortCriteria) {
                case 'name':
                    comparison = a.name.localeCompare(b.name)
                    break
                case 'date':
                    comparison = new Date(a.last_modified).getTime() - new Date(b.last_modified).getTime()
                    break
                case 'createat':
                    comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    break
                case 'size':
                    comparison = a.size - b.size
                    break
            }
            return sortOrder === 'asc' ? comparison : -comparison
        })
    }, [allFiles, searchTerms, sortCriteria, sortOrder])

    // Calculate pagination
    const paginatedFiles = useMemo(() => {
        const start = (currentPage - 1) * imagesPerPage
        return sortedFiles.slice(start, start + imagesPerPage)
    }, [sortedFiles, currentPage, imagesPerPage])

    // Update total pages when filtered results change
    useEffect(() => {
        const totalPages = Math.ceil(sortedFiles.length / imagesPerPage)
        onTotalPagesChange(totalPages)

        if (currentPage > totalPages && totalPages > 0) {
            onPageChange(1)
        }
    }, [sortedFiles.length, imagesPerPage, currentPage, onTotalPagesChange, onPageChange])

    // Keyboard event listener
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.code === 'Space') {
                event.preventDefault()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    const searchResultCount = searchTerm ? sortedFiles.length : allFiles.length

    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-4">
                <FileSearch
                    searchTerm={searchTerm}
                    onSearchChange={handleSearch}
                    placeholder={t('locker.search.placeholder_with_tags')}
                    files={allFiles}
                />
                <FileSort
                    sortCriteria={sortCriteria}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                />
            </div>

            {searchTerm && (
                <div className="text-sm text-gray-500">
                    {t('locker.search.results', { count: searchResultCount })}
                </div>
            )}

            <motion.div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 p-4 bg-background/50 backdrop-blur-sm rounded-lg border border-border"
                layout
                key={`${sortCriteria}-${sortOrder}`}
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
                            />
                        ))
                    ) : searchTerm.trim() ? (
                        <div className="col-span-full flex flex-col items-center justify-center h-64 mt-8">
                            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4"/>
                            <p className="text-muted-foreground font-medium">
                                {t('locker.search.no_results', {searchTerm})}
                            </p>
                        </div>
                    ) : null}
                </AnimatePresence>
            </motion.div>

            {selectedImageIndex !== null && (
                <ImageViewer
                    files={paginatedFiles}
                    initialIndex={selectedImageIndex}
                    onClose={handleCloseViewer}
                />
            )}
        </div>
    )
}