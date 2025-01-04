'use client'

import React, {useState, useEffect, useCallback, useRef} from 'react'
import {toast} from "@/hooks/use-toast"
import {Loader2, AlertCircle} from 'lucide-react'
import {open} from '@tauri-apps/plugin-dialog'
import {invoke} from "@tauri-apps/api/core";
import {MoveDialog} from '@/components/widget/Move-dialog'
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
import {FileGrid} from '@/components/widget/FileGrid'
import {CategorySelector} from '@/components/widget/CategorySelector'
import {PaginationControls} from '@/components/widget/PaginationControls'
import {File, FileResponse, Category} from '@/types/file'
import {useTranslation} from "react-i18next";
import {useSharedSettings} from "@/utils/SettingsContext";

const ALLOWED_FILE_TYPES = ['.png', '.jpg', '.jpeg', '.jfif', '.webp'];

const PAGE_STORAGE_KEY = 'lockerz-current-page'
const IMAGES_PER_PAGE_STORAGE_KEY = 'lockerz-images-per-page'

interface FileMoveResponse {
    success: boolean;
    file: {
        name: string;
        category: string;
        filepath: string;
        size: number;
        last_modified: string;
    };
}

export default function Locker() {
    const {t} = useTranslation();
    const {settings} = useSharedSettings();

    const [files, setFiles] = useState<File[]>([])
    const [allFiles, setAllFiles] = useState<File[]>([])
    const [categories, setCategories] = useState<Category[]>([])
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

    async function show_in_folder(path: string) {
        await invoke('show_in_folder', {path});
    }

    const fetchAllFiles = useCallback(async () => {
        try {
            const data: FileResponse = await invoke('get_files', {
                page: 1,
                limit: -1,
                category: selectedCategory, // Category filter
            });
            setAllFiles(data.files);  // Store all files in state
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
            const data: FileResponse = await invoke('get_files', {
                page: currentPage,
                limit: imagesPerPage,  // This can be null for no pagination
                category: selectedCategory,
            });
            setFiles(data.files);
            setTotalPages(data.total_pages);  // Use total_pages from response
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
            const data: Category = await invoke("get_categories");
            if (!data.ok) {
                new Error('Failed to fetch categories')
            }
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
        const savedPage = localStorage.getItem(PAGE_STORAGE_KEY);
        const savedImagesPerPage = localStorage.getItem(IMAGES_PER_PAGE_STORAGE_KEY);

        if (savedPage) {
            setCurrentPage(parseInt(savedPage, 10));
        }
        if (savedImagesPerPage) {
            setImagesPerPage(parseInt(savedImagesPerPage, 10));
        }

        if (rememberCategory && selectedCategory) {
            localStorage.setItem('lastSelectedCategory', selectedCategory);
        }

        // Fetch categories, files, and pagination data only once
        const loadData = async () => {
            await fetchCategories(); // Fetch categories
            if (isRememberCategory()) {
                const lastCategory = localStorage.getItem('lastSelectedCategory');
                if (lastCategory) {
                    setSelectedCategory(lastCategory); // Set the last selected category
                }
            }
            await fetchAllFiles(); // Fetch files
            await fetchPaginatedFiles(); // Fetch paginated files
        };

        loadData(); // Call the async function only once

    }, [
        selectedCategory,        // Dependency on selected category
        currentPage,             // Dependency on current page
        imagesPerPage,           // Dependency on images per page
        rememberCategory,        // Dependency on remember category
        isRememberCategory,      // Dependency on category remember setting
        fetchCategories,         // Function dependencies
        fetchAllFiles,           // Function dependencies
        fetchPaginatedFiles,     // Function dependencies
    ]);

    const handleFileDrop = useCallback(async (droppedFiles?: string[]) => {
        let filesToProcess: (globalThis.File | string)[] = [];

        if (droppedFiles?.length > 0) {
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
                if (!selectedFiles?.length) {
                    toast({title: "No images Selected", description: "No images were selected.", variant: "destructive"});
                    return;
                }
                filesToProcess = selectedFiles;
            } catch (error) {
                toast({title: t('toast.titleType.error'), description: "File dialog error", variant: "destructive"});
                return;
            }
        }

        const getFileName = (file: globalThis.File | string): string =>
            file instanceof globalThis.File ? file.name : file.replace(/^.*[\\/]/, '');

        const validFiles = filesToProcess.filter(file =>
            ALLOWED_FILE_TYPES.some(type => getFileName(file).toLowerCase().endsWith(type))
        );

        if (!validFiles.length) {
            toast({title: "No Valid Files", description: "No valid file types selected.", variant: "destructive"});
            return;
        }

        const category = categoryRef.current === 'all' ? 'uncategorized' : categoryRef.current;

        const duplicateFiles = validFiles.filter(file =>
            files.some(existingFile => existingFile.name === getFileName(file) && existingFile.category === category)
        );

        if (duplicateFiles.length) {
            toast({
                title: t('toast.titleType.warning'),
                description: `${duplicateFiles.length} duplicate image(s) skipped.`,
                variant: "destructive"
            });
            return;
        }

        let successCount = 0;
        let failCount = 0;

        for (const file of validFiles) {
            try {
                let response;
                if (file instanceof globalThis.File) {
                    const buffer = await file.arrayBuffer();
                    response = await invoke<FileMoveResponse>('save_and_move_file', {
                        fileName: file.name,
                        fileContent: Array.from(new Uint8Array(buffer)),
                        category: category
                    });
                } else {
                    response = await invoke<FileMoveResponse>('move_file', {
                        originalPath: file,
                        category: category
                    });
                }
                setFiles(prevFiles => [response.file, ...prevFiles]);
                successCount++;
            } catch (error) {
                failCount++;
                console.error(error);
            }
        }

        if (successCount) {
            toast({title: t('toast.titleType.success'), description: `${successCount} file(s) moved successfully`});
        }
        if (failCount) {
            toast({
                title: t('toast.titleType.error'),
                description: `Failed to move ${failCount} file(s)`,
                variant: "destructive"
            });
        }

        await fetchAllFiles();

    }, [selectedCategory, files, fetchAllFiles, t]);

    const onCategoryChange = useCallback((value: string) => {
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
            await invoke("delete_file", {
                category: file.category,
                name: file.name,
            })
            setFiles(prevFiles => prevFiles.filter(f => f.name !== file.name || f.category !== file.category))
            toast({
                title: t('toast.titleType.success'),
                description: `${file.name} deleted successfully`,
            })
        } catch (error) {
            toast({
                title: t('toast.titleType.error'),
                description: `Failed to delete Image ${file.name}`,
                variant: "destructive",
            })
        }
        setDeleteDialogOpen(false)
        await fetchAllFiles()
    }

    const handleMove = async (newCategory: string) => {
        if (!selectedFile) return
        try {
            await invoke("move_file_category", {
                oldCategory: selectedFile.category,
                newCategory,
                fileName: selectedFile.name,
            })
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
        <div className="flex h-screen">
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
                                <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary"/>
                                <p className="text-foreground font-medium">Loading images...</p>
                            </div>
                        ) : files.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 mt-8">
                                <AlertCircle className="w-12 h-12 text-muted-foreground mb-4"/>
                                <p className="text-muted-foreground font-medium">No images found in this category</p>
                            </div>
                        ) : (
                            <FileGrid
                                files={files}
                                allFiles={allFiles}
                                onViewFileAction={async (file) => {
                                    await show_in_folder(file.filepath);
                                }}
                                onDeleteFileAction={(file) => {
                                    setSelectedFile(file);
                                    setDeleteDialogOpen(true);
                                }}
                                onMoveFileAction={(file) => {
                                    setSelectedFile(file);
                                    setMoveDialogOpen(true);
                                }}
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

