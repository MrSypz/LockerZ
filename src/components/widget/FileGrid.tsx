import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { File } from '@/types/file'
import {motion, AnimatePresence} from "framer-motion"
import { useTranslation } from 'react-i18next'
import {AlertCircle, Upload} from 'lucide-react'
import { ImageViewer } from './Image-viewer'
import FileCard from "@/components/widget/FileCard"
import { FileSearch } from "@/components/widget/FileSearch"
import { FileSort } from "@/components/widget/FileSort"
import { useBatchProcessing} from './BatchProcessingProvider';
import {useSharedSettings} from "@/utils/SettingsContext";
import {getCurrentWindow} from "@tauri-apps/api/window";

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
    allFiles: File[]
    onViewFileAction: (file: File) => void
    onDeleteFileAction: (file: File) => void
    onMoveFileAction: (file: File) => void
    onTagAction: (file: File) => void
    currentPage: number
    imagesPerPage: number
    onPageChange: (page: number) => void
    onTotalPagesChange: (pages: number) => void
    uploadImgFiles: (droppedFiles?: string[]) => Promise<void>;
}

export function FileGrid({
                             allFiles,
                             onViewFileAction,
                             onDeleteFileAction,
                             onMoveFileAction,
                             onTagAction,
                             currentPage,
                             imagesPerPage,
                             onPageChange,
                             onTotalPagesChange,
                             uploadImgFiles
                         }: FileGridProps) {
    const totalColumns = useColumnCount()
    const { t } = useTranslation()
    const [isDragActive, setIsDragActive] = useState(false)

    const [sortState, setSortState] = useState(() => getSavedSortPreferences())
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
    const { settings } = useSharedSettings();
    const {
        optimizeImages,
        reset
    } = useBatchProcessing();

    useEffect(() => {
        let isMounted = true
        let unlistenFunction

        const setupDragDropListener = async () => {
            if (!isMounted) return

            unlistenFunction = await getCurrentWindow().onDragDropEvent((event) => {
                if (!isMounted) return

                switch (event.payload.type) {
                    case 'over':
                        setIsDragActive(true)
                        break
                    case 'drop':
                        setIsDragActive(false)
                        uploadImgFiles(event.payload.paths)
                        break
                    default:
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

    const handleSort = useCallback((criteria: SortCriteria, order: SortOrder) => {
        setSortState({ criteria, order })
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

    const searchTerms = useMemo(() =>
            searchTerm.trim() ? parseSearchInput(searchTerm) : null
        , [searchTerm])

    const sortedFiles = useMemo(() => {
        let filteredFiles = allFiles

        if (searchTerms) {
            const { text, tags, categories } = searchTerms
            filteredFiles = filteredFiles.filter(file => {
                const nameMatch = text ?
                    file.name.toLowerCase().includes(text.toLowerCase()) :
                    true

                if (!tags.length && !categories.length) {
                    return nameMatch
                }

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

        return [...filteredFiles].sort((a, b) => {
            let comparison = 0
            switch (sortState.criteria) {
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
            return sortState.order === 'asc' ? comparison : -comparison
        })
    }, [allFiles, searchTerms, sortState]) // Added sortState as dependency

    const paginatedFiles = useMemo(() => {
        const start = (currentPage - 1) * imagesPerPage
        return sortedFiles.slice(start, start + imagesPerPage)
    }, [sortedFiles, currentPage, imagesPerPage])

    useEffect(() => {
        if (paginatedFiles.length > 0) {
            // Use the optimizeImages function from context
            optimizeImages(
                paginatedFiles,
                settings.imageWidth,
                settings.imageHeight,
                settings.imageQuality
            ).catch(error => {
                console.error('Failed to optimize images:', error);
            });
        }

        return () => {
            reset(); // Clean up when component unmounts or files change
        };
    }, [paginatedFiles, settings, optimizeImages, reset]);

    useEffect(() => {
        const totalPages = Math.ceil(sortedFiles.length / imagesPerPage)
        onTotalPagesChange(totalPages)

        if (currentPage > totalPages && totalPages > 0) {
            onPageChange(1)
        }
    }, [sortedFiles.length, imagesPerPage, currentPage, onTotalPagesChange, onPageChange])

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.code === 'Space') {
                event.preventDefault()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    useEffect(() => {
        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && selectedImageIndex !== null) {
                handleCloseViewer();
            }
        };

        window.addEventListener('keydown', handleEscapeKey);
        return () => window.removeEventListener('keydown', handleEscapeKey);
    }, [selectedImageIndex, handleCloseViewer]);

    const searchResultCount = searchTerm ? sortedFiles.length : allFiles.length

    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-4">
                <FileSearch
                    searchTerm={searchTerm}
                    onSearchChange={handleSearch}
                    files={allFiles}
                />
                <FileSort
                    sortCriteria={sortState.criteria}
                    sortOrder={sortState.order}
                    onSort={handleSort}
                />
            </div>

            {searchTerm && (
                <div className="text-sm text-gray-500">
                    {t('locker.search.results', {count: searchResultCount})}
                </div>
            )}

            <motion.div
                layout
                className={`
                    relative min-h-[300px]
                    grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 
                    gap-4 p-4 rounded-lg transition-colors duration-300
                    ${isDragActive
                    ? 'bg-primary/5 border-2 border-dashed border-primary ring-4 ring-primary/10'
                    : 'bg-background/50 backdrop-blur-sm border border-border'
                }
                `}
                animate={{
                    scale: isDragActive ? 0.99 : 1,
                }}
                transition={{ duration: 0.2 }}
            >
                {/* Overlay for drag state */}
                <AnimatePresence>
                    {isDragActive && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 rounded-lg z-50
                                flex items-center justify-center"
                            style={{
                                backgroundColor: 'rgba(var(--primary) / 0.1)',
                                backdropFilter: 'blur(8px)'
                            }}
                        >
                            <motion.div
                                className="text-center p-8 rounded-xl"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Upload className="h-16 w-16 mx-auto mb-4 text-primary animate-bounce" />
                                <p className="text-xl font-semibold text-primary mb-2">
                                    Drop images here
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Release to upload your files
                                </p>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

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
                    ) : (
                        <div className="col-span-full flex flex-col items-center justify-center h-64">
                            <Upload className="w-12 h-12 text-muted-foreground mb-4"/>
                            <p className="text-muted-foreground font-medium">
                                Drop images here or click to upload
                            </p>
                        </div>
                    )}
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