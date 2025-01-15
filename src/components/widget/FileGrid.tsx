import React, {useState, useEffect} from 'react'
import {File} from '@/types/file'
import {motion, AnimatePresence} from "framer-motion"
import {useTranslation} from 'react-i18next'
import {AlertCircle} from 'lucide-react'
import {ImageViewer} from './Image-viewer';
import {FileCard} from "@/components/widget/FileCard";
import {FileSearch} from "@/components/widget/FileSearch";
import {FileSort} from "@/components/widget/FileSort";

type SortCriteria = 'name' | 'date' | 'createat' | 'size';
type SortOrder = 'asc' | 'desc';

interface SearchTerms {
    text: string;
    tags: string[];
    categories: string[]
}

interface SortPreferences {
    criteria: SortCriteria;
    order: SortOrder;
}

const getSavedSortPreferences = (): SortPreferences => {
    const saved = localStorage.getItem('fileSortPreferences');
    if (saved) {
        return JSON.parse(saved);
    }
    return { criteria: 'name', order: 'asc' };
};

const saveSortPreferences = (preferences: SortPreferences) => {
    localStorage.setItem('fileSortPreferences', JSON.stringify(preferences));
};

const parseSearchInput = (input: string): SearchTerms => {
    const tags: string[] = [];
    const categories: string[] = [];
    let remainingText = input;

    // Extract tags with spaces (#tag with space)
    const tagRegex = /#([^#@]+?)(?=\s*[#@]|$)/g;
    let tagMatch;
    while ((tagMatch = tagRegex.exec(input)) !== null) {
        const tagText = tagMatch[1].trim();
        if (tagText) {
            tags.push(tagText);
        }
        // Remove the matched tag from remaining text
        remainingText = remainingText.replace(tagMatch[0], '');
    }

    // Extract categories with spaces (@category with space)
    const categoryRegex = /@([^#@]+?)(?=\s*[#@]|$)/g;
    let categoryMatch;
    while ((categoryMatch = categoryRegex.exec(input)) !== null) {
        const categoryText = categoryMatch[1].trim();
        if (categoryText) {
            categories.push(categoryText);
        }
        // Remove the matched category from remaining text
        remainingText = remainingText.replace(categoryMatch[0], '');
    }

    // Clean up the remaining text
    const text = remainingText
        .replace(/#/g, '')  // Remove any leftover # symbols
        .replace(/@/g, '')  // Remove any leftover @ symbols
        .trim();

    return {
        text,
        tags: tags.map(tag => tag.toLowerCase()),
        categories: categories.map(cat => cat.toLowerCase())
    };
};

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
    const [sortedFiles, setSortedFiles] = useState(files)
    const savedPreferences = getSavedSortPreferences();
    const [sortCriteria, setSortCriteria] = useState<SortCriteria>(savedPreferences.criteria)
    const [sortOrder, setSortOrder] = useState<SortOrder>(savedPreferences.order)
    const [searchTerm, setSearchTerm] = useState('')
    const {t} = useTranslation()
    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

    const handleSort = (criteria: SortCriteria, order: SortOrder) => {
        setSortCriteria(criteria);
        setSortOrder(order);
        saveSortPreferences({ criteria, order });
    }

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.code === 'Space') {
                event.preventDefault();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    useEffect(() => {
        let filteredAndSortedFiles = [...allFiles];

        if (searchTerm.trim()) {
            const { text, tags, categories } = parseSearchInput(searchTerm);
            filteredAndSortedFiles = filteredAndSortedFiles.filter(file => {
                // Text match
                const nameMatch = text ?
                    file.name.toLowerCase().includes(text.toLowerCase()) :
                    true;

                // If no tags or categories are specified, only use text match
                if (!tags.length && !categories.length) {
                    return nameMatch;
                }

                // Tag match - ALL specified tags must match (AND logic)
                const tagMatch = tags.length > 0 ?
                    tags.every(searchTag => {
                        const normalizedSearchTag = searchTag.toLowerCase().trim();
                        return file.tags?.some(fileTag =>
                            fileTag.name.toLowerCase().trim() === normalizedSearchTag
                        );
                    }) :
                    true;

                // Category match - ALL specified categories must match (AND logic)
                const categoryMatch = categories.length > 0 ?
                    categories.every(cat => {
                        const normalizedCat = cat.toLowerCase().trim();
                        const normalizedFileCat = file.category?.toLowerCase().trim();
                        return normalizedFileCat === normalizedCat;
                    }) :
                    true;

                // Return items that match ALL conditions (text AND tags AND categories)
                return nameMatch && tagMatch && categoryMatch;
            });
        }

        filteredAndSortedFiles.sort((a, b) => {
            let comparison = 0;
            switch (sortCriteria) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'date':
                    comparison = new Date(a.last_modified).getTime() - new Date(b.last_modified).getTime();
                    break;
                case 'createat':
                    comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                    break;
                case 'size':
                    comparison = a.size - b.size;
                    break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        const totalFilteredPages = Math.ceil(filteredAndSortedFiles.length / imagesPerPage);
        onTotalPagesChange(totalFilteredPages);

        if (currentPage > totalFilteredPages && totalFilteredPages > 0) onPageChange(1);


        const start = (currentPage - 1) * imagesPerPage;
        const end = start + imagesPerPage;
        setSortedFiles(filteredAndSortedFiles.slice(start, end));
    }, [files, allFiles, sortCriteria, sortOrder, searchTerm, currentPage, imagesPerPage]);

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newSearchTerm = event.target.value;
        setSearchTerm(newSearchTerm);
        if (currentPage !== 1) {
            onPageChange(1);
        }
    };

    const handleSelectImage = (index: number) => {
        setSelectedImageIndex(index);
    };

    const handleCloseViewer = () => {
        setSelectedImageIndex(null);
    };

    const getSearchResultsText = () => {
        const { text, tags, categories } = parseSearchInput(searchTerm);
        const filteredCount = allFiles.filter(file => {
            // Text match
            const nameMatch = text ?
                file.name.toLowerCase().includes(text.toLowerCase()) :
                true;

            // If no tags or categories are specified, only use text match
            if (!tags.length && !categories.length) {
                return nameMatch;
            }

            // Tag match - ALL specified tags must match (AND logic)
            const tagMatch = tags.length > 0 ?
                tags.every(searchTag => {
                    const normalizedSearchTag = searchTag.toLowerCase().trim();
                    return file.tags?.some(fileTag =>
                        fileTag.name.toLowerCase().trim() === normalizedSearchTag
                    );
                }) :
                true;

            // Category match - ALL specified categories must match (AND logic)
            const categoryMatch = categories.length > 0 ?
                categories.every(cat => {
                    const normalizedCat = cat.toLowerCase().trim();
                    const normalizedFileCat = file.category?.toLowerCase().trim();
                    return normalizedFileCat === normalizedCat;
                }) :
                true;

            // Return items that match ALL conditions
            return nameMatch && tagMatch && categoryMatch;
        }).length;

        return t('locker.search.results', { count: filteredCount });
    };

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
                    {getSearchResultsText()}
                </div>
            )}

            <motion.div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 p-4 bg-background/50 backdrop-blur-sm rounded-lg border border-border"
                layout
                key={`${sortCriteria}-${sortOrder}`}
            >
                <AnimatePresence>
                    {sortedFiles.length > 0 ? (
                        sortedFiles.map((file, index) => (
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
                    files={sortedFiles}
                    initialIndex={selectedImageIndex}
                    onClose={handleCloseViewer}
                />
            )}
        </div>
    )
}