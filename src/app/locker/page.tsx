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
import {ALLOWED_FILE_TYPES, IMAGES_PER_PAGE_STORAGE_KEY, PAGE_STORAGE_KEY} from "@/lib/localstoragekey";
import {TagManagerDialog} from "@/components/widget/TagManagerDialog";
import {CacheData} from "@/types/cache";

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
        if (typeof window !== 'undefined' && settings.rememberCategory) return localStorage.getItem('lastSelectedCategory') || 'all';
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
    const [rememberCategory] = useState(settings.rememberCategory)

    const [tagManagerOpen, setTagManagerOpen] = useState(false);
    const [selectedFileForTags, setSelectedFileForTags] = useState<File | null>(null);
    const filesCache = useRef<Map<string, CacheData>>(new Map());

    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

    const isCacheValid = (cacheData: CacheData | undefined) => {
        if (!cacheData) return false;
        const now = Date.now();
        return (now - cacheData.timestamp) < CACHE_DURATION;
    };
    const clearCategoryCache = useCallback((category: string) => {
        Array.from(filesCache.current.keys()).forEach(key => {
            if (key.includes(`-${category}`)) {
                filesCache.current.delete(key);
            }
        });
    }, []);

    const fetchCategoryData = async (
        page: number,
        limit: number,
        category: string,
        setLoadingState: boolean = true
    ): Promise<FileResponse | null> => {
        if (setLoadingState) setIsLoading(true);
        try {
            const data: FileResponse = await invoke('get_files', {
                page,
                limit,
                category,
            });
            return data;
        } catch (error) {
            console.error('Error fetching data:', error);
            toast({
                title: t('toast.titleType.error'),
                description: "Failed to fetch data",
                variant: "destructive",
            });
            return null;
        } finally {
            if (setLoadingState) setIsLoading(false);
        }
    };

    const updateCacheAndState = (
        data: FileResponse,
        page: number,
        limit: number,
        category: string,
        includeAllFiles?: File[]
    ) => {
        const cacheKey = `${page}-${limit}-${category}`;
        filesCache.current.set(cacheKey, {
            files: data.files,
            totalPages: data.total_pages,
            timestamp: Date.now(),
            allFiles: includeAllFiles
        });

        setFiles(data.files);
        setTotalPages(data.total_pages);
        if (includeAllFiles) {
            setAllFiles(includeAllFiles);
        }
    };
    const handleEmptyData = () => {
        setFiles([]);
        setTotalPages(0);
        setAllFiles([]);
        toast({
            title: "No images found",
            description: "This category does not contain any images."
        });
    };

    async function show_in_folder(path: string) {
        await invoke('show_in_folder', {path});
    }

    const fetchAllFiles = useCallback(async () => {
        try {
            const data: FileResponse = await invoke('get_files', {
                page: 1,
                limit: -1,
                category: selectedCategory,
            });
            setAllFiles(data.files);
        } catch (error) {
            toast({
                title: t('toast.titleType.error'),
                description: "Failed to fetch all files",
                variant: "destructive",
            });
            setAllFiles([]);
        }
    }, [selectedCategory, t]);

    const fetchPaginatedFiles = useCallback(async () => {
        const cacheKey = `${currentPage}-${imagesPerPage}-${selectedCategory}`;

        if (filesCache.current.has(cacheKey)) {
            const cachedData = filesCache.current.get(cacheKey);
            if (!cachedData?.files?.length) {
                setFiles([]); // Just set empty array, FileGrid won't render due to the condition
                setTotalPages(0);
                return;
            }
            setFiles(cachedData.files);
            setTotalPages(cachedData.totalPages);
            return;
        }

        setIsLoading(true);
        try {
            const data: FileResponse = await invoke('get_files', {
                page: currentPage,
                limit: imagesPerPage,
                category: selectedCategory,
            });

            if (data.total_files === 0) {
                setFiles([]); // This will trigger the "no images" message
                setTotalPages(0);
                return;
            }

            // Only set cache and update files if we actually have files
            filesCache.current.set(cacheKey, {
                files: data.files,
                totalPages: data.total_pages,
            });

            setFiles(data.files);
            setTotalPages(data.total_pages);
        } catch (error) {
            console.error('Error fetching paginated files:', error);
            setFiles([]); // Error case also shows "no images" message
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, imagesPerPage, selectedCategory]);

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

    const handleFileDrop = useCallback(async (droppedFiles?: string[]) => {
        let filesToProcess: (globalThis.File | string)[] = [];

        // @ts-ignore
        if (droppedFiles?.length > 0) {
            // @ts-ignore
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
                    toast({
                        title: "No images Selected",
                        description: "No images were selected.",
                        variant: "destructive"
                    });
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

        const category = selectedCategory === 'all' ? 'uncategorized' : selectedCategory;

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
            toast({
                title: t('toast.titleType.success'),
                description: `${successCount} file(s) moved to ${category} successfully`
            });
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

    const handleDelete = async (file: File) => {
        try {
            await invoke("delete_file", {
                category: file.category,
                name: file.name,
            });

            Array.from(filesCache.current.keys()).forEach(key => {
                if (key.includes(`-${file.category}`)) {
                    filesCache.current.delete(key);
                }
            });

            setFiles(prevFiles => prevFiles.filter(f => f.name !== file.name || f.category !== file.category));
            toast({
                title: t('toast.titleType.success'),
                description: `${file.name} deleted successfully`,
            });
        } catch (error) {
            toast({
                title: t('toast.titleType.error'),
                description: `Failed to delete Image ${file.name}`,
                variant: "destructive",
            });
        }
        setDeleteDialogOpen(false);
        await fetchAllFiles();
    };

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
                description: `File ${selectedFile.name} moved to ${newCategory}successfully`,
            })
        } catch (error) {
            toast({
                title: t('toast.titleType.error'),
                description: "Failed to move file",
                variant: "destructive",
            })
        }
        setMoveDialogOpen(false)
        await fetchAllFiles()
    }

    const handleImagesPerPageChange = useCallback(async (value: number) => {
        setImagesPerPage(value);
        setCurrentPage(1);
        clearCategoryCache(selectedCategory); // Clear cache for current category
        localStorage.setItem(IMAGES_PER_PAGE_STORAGE_KEY, value.toString());
        localStorage.setItem(PAGE_STORAGE_KEY, '1');

        // Fetch fresh data
        setIsLoading(true);
        try {
            const data: FileResponse = await invoke('get_files', {
                page: 1,
                limit: value,
                category: selectedCategory,
            });

            if (data.total_files === 0) {
                setFiles([]);
                setTotalPages(0);
                return;
            }

            setFiles(data.files);
            setTotalPages(data.total_pages);

            // Update cache with new data
            const cacheKey = `1-${value}-${selectedCategory}`;
            filesCache.current.set(cacheKey, {
                files: data.files,
                totalPages: data.total_pages,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error updating page size:', error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedCategory, clearCategoryCache]);

    const handlePageChange = useCallback(async (page: number) => {
        setCurrentPage(page);
        localStorage.setItem(PAGE_STORAGE_KEY, page.toString());

        const cacheKey = `${page}-${imagesPerPage}-${selectedCategory}`;
        const cachedData = filesCache.current.get(cacheKey);

        if (isCacheValid(cachedData)) {
            setFiles(cachedData.files);
            return;
        }

        const data = await fetchCategoryData(page, imagesPerPage, selectedCategory);
        if (!data || data.total_files === 0) {
            handleEmptyData();
            return;
        }

        updateCacheAndState(data, page, imagesPerPage, selectedCategory);
    }, [selectedCategory, imagesPerPage]);

    const handleTagsAction = (file: File) => {
        setSelectedFileForTags(file);
        setTagManagerOpen(true);
    };

    const onCategoryChange = useCallback(async (value: string) => {
        setIsLoading(true);
        setSelectedCategory(value);
        setCurrentPage(1);

        // Update localStorage
        localStorage.setItem(PAGE_STORAGE_KEY, '1');
        if (rememberCategory) {
            localStorage.setItem('lastSelectedCategory', value);
        }

        const cacheKey = `1-${imagesPerPage}-${value}`;
        const cachedData = filesCache.current.get(cacheKey);

        if (isCacheValid(cachedData)) {
            setFiles(cachedData.files);
            setTotalPages(cachedData.totalPages);
            if (cachedData.allFiles) {
                setAllFiles(cachedData.allFiles);
            }
            setIsLoading(false);
            return;
        }

        // Fetch initial data
        const initialData = await fetchCategoryData(1, imagesPerPage, value);
        if (!initialData || initialData.total_files === 0) {
            handleEmptyData();
            setIsLoading(false);
            return;
        }

        // Fetch all files if needed
        const allFilesData = await fetchCategoryData(1, -1, value, false);
        if (allFilesData) {
            updateCacheAndState(initialData, 1, imagesPerPage, value, allFilesData.files);
        }

        setIsLoading(false);
    }, [imagesPerPage, rememberCategory, t]);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                await fetchCategories();

                let initialCategory = 'all';
                if (rememberCategory) {
                    const lastCategory = localStorage.getItem('lastSelectedCategory');
                    if (lastCategory) {
                        initialCategory = lastCategory;
                    }
                }

                await onCategoryChange(initialCategory);
            } catch (error) {
                console.error('Error loading initial data:', error);
            }
        };

        loadInitialData();
    }, [fetchCategories, onCategoryChange, rememberCategory]);

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
                        ) : !files || files.length === 0 ? (  // Add null/undefined check
                            <div className="flex flex-col items-center justify-center h-64 mt-8">
                                <AlertCircle className="w-12 h-12 text-muted-foreground mb-4"/>
                                <p className="text-muted-foreground font-medium">
                                    {t('categories.imageSelection.noImages')}
                                </p>
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
                                onTagAction={handleTagsAction}
                                currentPage={currentPage}
                                imagesPerPage={imagesPerPage}
                                onPageChange={handlePageChange}
                                onTotalPagesChange={setTotalPages}
                            />

                        )}
                        {selectedFileForTags && (
                            <TagManagerDialog
                                file={selectedFileForTags}
                                isOpen={tagManagerOpen}
                                onClose={async () => {
                                    setTagManagerOpen(false);
                                    setSelectedFileForTags(null);
                                    filesCache.current.clear();
                                    await fetchPaginatedFiles();
                                    await fetchAllFiles();
                                }}
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