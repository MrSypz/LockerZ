'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from "@/hooks/use-toast"
import { Loader2, AlertCircle } from 'lucide-react'
import { open } from '@tauri-apps/plugin-dialog'
import { MoveDialog } from '@/components/widget/Move-dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { FileGrid } from '@/components/widget/FileGrid'
import { CategorySelector } from '@/components/widget/CategorySelector'
import { PaginationControls } from '@/components/widget/PaginationControls'
import { File } from '@/types/file'
import {useTranslation} from "react-i18next";
import {API_URL} from "@/lib/zaphire";
import {useSharedSettings} from "@/utils/SettingsContext";

const ALLOWED_FILE_TYPES = ['.png', '.jpg', '.jpeg', '.jfif', '.webp'];

const PAGE_STORAGE_KEY = 'lockerz-current-page'
const IMAGES_PER_PAGE_STORAGE_KEY = 'lockerz-images-per-page'

export default function Locker() {
    const { t } = useTranslation();
    const { settings } = useSharedSettings();

    const [files, setFiles] = useState<File[]>([])
    const [allFiles, setAllFiles] = useState<File[]>([])
    const [categories, setCategories] = useState<string[]>([])
    const [selectedCategory, setSelectedCategory] = useState<string>(() => {
        if (typeof window !== 'undefined' && settings.rememberCategory) {
            return localStorage.getItem('lastSelectedCategory') || 'all';
        }
        return 'all';
    });
    const [isLoading, setIsLoading] = useState(true)
    const [isCategoriesLoading, setIsCategoriesLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1)
    const [moveDialogOpen, setMoveDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [imagesPerPage, setImagesPerPage] = useState(() => {
        const savedImagesPerPage = localStorage.getItem(IMAGES_PER_PAGE_STORAGE_KEY)
        return savedImagesPerPage ? parseInt(savedImagesPerPage, 10) : 10
    })
    const [rememberCategory, setRememberCategory] = useState(settings.rememberCategory)

    const categoryRef = useRef(selectedCategory);

    const isRememberCategory = useCallback(() => {
        setRememberCategory(settings.rememberCategory);
        if (!settings.rememberCategory) {
            localStorage.removeItem('lastSelectedCategory');
        }
    }, [settings.rememberCategory]);

    const fetchAllFiles = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/files?category=${selectedCategory}&limit=no-limit`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setAllFiles(data.files);
        } catch (error) {
            console.error('Error fetching all files:', error);
            toast({
                title: t('toast.titleType.error'),
                description: "Failed to fetch all files",
                variant: "destructive",
            });
        }
    }, [selectedCategory, t]);


    const fetchPaginatedFiles = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/files?page=${currentPage}&limit=${imagesPerPage}&category=${selectedCategory}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setFiles(data.files);
            setTotalPages(data.totalPages);
        } catch (error) {
            console.error('Error fetching paginated files:', error);
            toast({
                title: t('toast.titleType.error'),
                description: "Failed to fetch files",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, imagesPerPage, selectedCategory, t]);

    const fetchCategories = useCallback(async () => {
        setIsCategoriesLoading(true)
        try {
            const response = await fetch(`${API_URL}/categories`)
            if (!response.ok) {
                new Error('Failed to fetch categories')
            }
            const data = await response.json()
            setCategories(data.map((category: { name: string }) => category.name))
        } catch (error) {
            toast({
                title: t('toast.titleType.error'),
                description: "Failed to fetch categories",
                variant: "destructive",
            })
        } finally {
            setIsCategoriesLoading(false)
        }
    }, [t]);

    useEffect(() => {
        const savedPage = localStorage.getItem(PAGE_STORAGE_KEY)
        const savedImagesPerPage = localStorage.getItem(IMAGES_PER_PAGE_STORAGE_KEY)

        if (savedPage) {
            setCurrentPage(parseInt(savedPage, 10))
        }
        if (savedImagesPerPage) {
            setImagesPerPage(parseInt(savedImagesPerPage, 10))
        }

        isRememberCategory()
        fetchCategories();
        fetchAllFiles().then(() => fetchPaginatedFiles());
    }, [isRememberCategory, fetchAllFiles, fetchPaginatedFiles, fetchCategories])


    useEffect(() => {
        categoryRef.current = selectedCategory;
        if (rememberCategory) {
            localStorage.setItem('lastSelectedCategory', selectedCategory)
        }
    }, [selectedCategory, rememberCategory]);


    useEffect(() => {
        if (selectedCategory) {
            fetchAllFiles().then(() => fetchPaginatedFiles());
        }
    }, [selectedCategory, currentPage, imagesPerPage, fetchAllFiles, fetchPaginatedFiles]);

    useEffect(() => {
        const savedPage = localStorage.getItem(PAGE_STORAGE_KEY);
        if (savedPage) {
            setCurrentPage(parseInt(savedPage, 10));
        }
    }, []);

    const handleFileDrop = useCallback(async (droppedFiles?: string[]) => {
        let filesToProcess: (globalThis.File | string)[] = [];
        if (droppedFiles?.length === 0) return;

        if (droppedFiles && droppedFiles.length > 0) {
            filesToProcess = droppedFiles;
        } else {
            try {
                const selectedFiles = await open({
                    multiple: true,
                    directory: false,
                    filters: [{
                        name: 'Images',
                        extensions: ['png', 'jpg', 'jpeg', 'jfif', 'webp']
                    }]
                });
                if (selectedFiles && Array.isArray(selectedFiles) && selectedFiles.length > 0) {
                    filesToProcess = selectedFiles;
                } else {
                    toast({
                        title: "No Files Selected",
                        description: "No files were selected.",
                        variant: "destructive",
                    });
                    return;
                }
            } catch (error) {
                toast({
                    title: t('toast.titleType.error'),
                    description: "An error occurred while opening the file dialog.",
                    variant: "destructive",
                });
                return;
            }
        }

        const getFileName = (file: globalThis.File | string): string => {
            if (file instanceof globalThis.File) {
                return file.name;
            } else {
                return file.replace(/^.*[\\/]/, ''); // This removes everything up to the last slash or backslash
            }
        };


        const validFiles = filesToProcess.filter(file =>
            ALLOWED_FILE_TYPES.some(type =>
                getFileName(file).toLowerCase().endsWith(type)
            )
        );

        if (validFiles.length === 0) {
            toast({
                title: "No Valid Files",
                description: "No files of the allowed types were selected.",
                variant: "destructive",
            });
            return;
        }

        const duplicateFiles = validFiles.filter(file => {
            const fileName = getFileName(file);
            return files.some(existingFile =>
                existingFile.name === fileName && existingFile.category === selectedCategory
            );
        });

        if (duplicateFiles.length > 0) {
            toast({
                title: t('toast.titleType.warning'),
                description: `${duplicateFiles.length} file(s) already exist in this category and will be skipped.`,
                variant: "destructive",
            });
            return;
        }

        const newFiles = validFiles.filter(file => {
            const fileName = getFileName(file);
            return !files.some(existingFile =>
                existingFile.name === fileName && existingFile.category === selectedCategory
            );
        });

        if (newFiles.length === 0) {
            toast({
                title: "No New Files",
                description: "All selected files already exist in this category.",
                variant: "destructive",
            });
            return;
        }

        for (const file of newFiles) {
            const formData = new FormData();
            if (file instanceof globalThis.File) {
                formData.append('file', file);
            } else {
                formData.append('originalPath', file);
            }
            formData.append('category', categoryRef.current === 'all' ? 'uncategorized' : categoryRef.current);
            try {
                const response = await fetch(`${API_URL}/move-file`, {
                    method: 'POST',
                    body: formData,
                });
                if (!response.ok) {
                    throw new Error('File move failed');
                }
                const data = await response.json();
                setFiles(prevFiles => [data.file, ...prevFiles]);
                toast({
                    title: t('toast.titleType.success'),
                    description: `File ${getFileName(file)} moved successfully`,
                });
                fetchAllFiles();
            } catch (error) {
                toast({
                    title: t('toast.titleType.error'),
                    description: `Failed to move file ${getFileName(file)}`,
                    variant: "destructive",
                });
            }
        }

        if (validFiles.length < filesToProcess.length) {
            toast({
                title: "Some Files Skipped",
                description: `${filesToProcess.length - validFiles.length} file(s) were skipped due to invalid file type.`,
                variant: "destructive",
            });
        }
    }, [selectedCategory, files, API_URL, fetchAllFiles, t]);

    const onCategoryChange = useCallback((value: string) => {
        console.log("Category changed to:", value);
        setSelectedCategory(value);
        setCurrentPage(1);
        localStorage.setItem(PAGE_STORAGE_KEY, '1'); // Reset page in localStorage
        if (rememberCategory) {
            localStorage.setItem('lastSelectedCategory', value);
        }
        fetchAllFiles().then(() => fetchPaginatedFiles());
    }, [rememberCategory, fetchAllFiles, fetchPaginatedFiles]);

    const handleDelete = async (file: File) => {
        try {
            const response = await fetch(`${API_URL}/delete-file`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    category: file.category,
                    name: file.name,
                }),
            })
            if (!response.ok) {
                throw new Error('Failed to delete file')
            }
            setFiles(prevFiles => prevFiles.filter(f => f.name !== file.name || f.category !== file.category))
            toast({
                title: t('toast.titleType.success'),
                description: "File deleted successfully",
            })
        } catch (error) {
            toast({
                title: t('toast.titleType.error'),
                description: "Failed to delete file",
                variant: "destructive",
            })
        }
        setDeleteDialogOpen(false)
        fetchAllFiles()
    }

    const handleMove = async (newCategory: string) => {
        if (!selectedFile) return

        try {
            const response = await fetch(`${API_URL}/move-file-category`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    oldCategory: selectedFile.category,
                    newCategory,
                    fileName: selectedFile.name,
                }),
            })
            if (!response.ok) {
                throw new Error('Failed to move file')
            }
            setFiles(prevFiles => prevFiles.filter(f => f.name !== selectedFile.name || f.category !== selectedFile.category))
            toast({
                title: t('toast.titleType.success'),
                description: "File moved successfully",
            })
        } catch (error) {
            toast({
                title: t('toast.titleType.error'),
                description: "Failed to move file",
                variant: "destructive",
            })
        }
        setMoveDialogOpen(false)
        fetchAllFiles()
    }

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        localStorage.setItem(PAGE_STORAGE_KEY, page.toString());
        fetchPaginatedFiles();
    };

    const handleImagesPerPageChange = (value: number) => {
        setImagesPerPage(value);
        setCurrentPage(1);
        localStorage.setItem(IMAGES_PER_PAGE_STORAGE_KEY, value.toString());
        localStorage.setItem(PAGE_STORAGE_KEY, '1');
    };

    return (
        <div className="flex h-screen bg-background">
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="container mx-auto max-w-[2000px]">
                        <h1 className="text-3xl font-bold gradient-text">Locker</h1>
                        <CategorySelector
                            selectedCategory={selectedCategory}
                            categories={categories}
                            isCategoriesLoading={isCategoriesLoading}
                            onCategoryChange={onCategoryChange}
                            uploadImgFiles={handleFileDrop}
                        />
                        {isLoading ? (
                            <div className="flex justify-center items-center h-24 mt-8">
                                <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
                                <p className="text-foreground font-medium">Loading images...</p>
                            </div>
                        ) : files.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 mt-8">
                                <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                                <p className="text-muted-foreground font-medium">No images found in this category</p>
                            </div>
                        ) : (
                            <FileGrid
                                files={files}
                                allFiles={allFiles}
                                onDeleteFileAction={(file) => {
                                    setSelectedFile(file);
                                    setDeleteDialogOpen(true);
                                }}
                                onMoveFileAction={(file) => {
                                    setSelectedFile(file);
                                    setMoveDialogOpen(true);
                                }}
                                apiUrl={API_URL}
                                currentPage={currentPage}
                                imagesPerPage={imagesPerPage}
                                onPageChange={handlePageChange}
                                onTotalPagesChange={setTotalPages}
                            />
                        )}
                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={totalPages}
                            imagesPerPage={imagesPerPage}
                            onPageChange={handlePageChange}
                            onImagesPerPageChange={handleImagesPerPageChange}
                        />
                    </div>
                </main>
            </div>

            <MoveDialog
                isOpen={moveDialogOpen}
                onCloseAction={() => setMoveDialogOpen(false)}
                onMoveAction={handleMove}
                categories={categories}
                currentCategory={selectedFile?.category || ''}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the file.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => selectedFile && handleDelete(selectedFile)}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

