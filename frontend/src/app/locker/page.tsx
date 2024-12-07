'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Sidebar } from "@/components/sidebar"
import { toast } from "@/hooks/use-toast"
import { AlertCircle, Loader2 } from 'lucide-react'
import { open } from '@tauri-apps/plugin-dialog'
import { MoveDialog } from '@/components/move-dialog'
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
import { ImageViewer } from '@/components/image-viewer'
import { FileGrid } from '@/components/FileGrid'
import { CategorySelector } from '@/components/CategorySelector'
import { PaginationControls } from '@/components/PaginationControls'
import { File } from '@/types/file'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const ALLOWED_FILE_TYPES = ['.png', '.jpg', '.jpeg', '.jfif', '.webp'];


export default function Locker() {
    const [files, setFiles] = useState<File[]>([])
    const [categories, setCategories] = useState<string[]>([])
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [isLoading, setIsLoading] = useState(true)
    const [isCategoriesLoading, setIsCategoriesLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [moveDialogOpen, setMoveDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [imagesPerPage, setImagesPerPage] = useState(10)
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const [isViewerOpen, setIsViewerOpen] = useState(false)
    const [rememberCategory, setRememberCategory] = useState(false)

    const isRememberCategory = async () => {
        try {
            const response = await fetch(`${API_URL}/get-settings`)
            const data = await response.json()
            setRememberCategory(data.rememberCategory)
            if (data.rememberCategory) {
                const storedCategory = localStorage.getItem('lastSelectedCategory')
                if (storedCategory) {
                    setSelectedCategory(storedCategory)
                }
            } else {
                localStorage.removeItem('lastSelectedCategory')
            }
        } catch (error) {
            console.error('Error fetching current settings:', error)
            toast({
                title: "Error",
                description: "Error fetching current settings",
                variant: "destructive",
            })
        }
    }

    useEffect(() => {
        isRememberCategory()
        fetchFiles()
        fetchCategories()
    }, [])

    useEffect(() => {
        if (rememberCategory) {
            localStorage.setItem('lastSelectedCategory', selectedCategory)
        }
    }, [selectedCategory, rememberCategory])

    useEffect(() => {
        fetchFiles()
    }, [selectedCategory, currentPage, imagesPerPage])

    const fetchFiles = async () => {
        setIsLoading(true)
        try {
            const response = await fetch(`${API_URL}/files?page=${currentPage}&limit=${imagesPerPage}&category=${selectedCategory}`)
            if (!response.ok) {
                throw new Error('Failed to fetch files')
            }
            const data = await response.json()
            setFiles(data.files)
            setTotalPages(data.totalPages)
        } catch (error) {
            console.error('Error fetching files:', error)
            toast({
                title: "Error",
                description: "Failed to fetch files",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const fetchCategories = async () => {
        setIsCategoriesLoading(true)
        try {
            const response = await fetch(`${API_URL}/categories`)
            if (!response.ok) {
                throw new Error('Failed to fetch categories')
            }
            const data = await response.json()
            setCategories(data.map((category: { name: string }) => category.name))
        } catch (error) {
            console.error('Error fetching categories:', error)
            toast({
                title: "Error",
                description: "Failed to fetch categories",
                variant: "destructive",
            })
        } finally {
            setIsCategoriesLoading(false)
        }
    }

    const uploadImgFiles = useCallback(async (droppedFiles?: globalThis.File[]) => {
        let filesToProcess: (globalThis.File | string)[] = [];

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
                        variant: "warning",
                    });
                    return;
                }
            } catch (error) {
                console.error('Error opening dialog:', error);
                toast({
                    title: "Error",
                    description: "An error occurred while opening the file dialog.",
                    variant: "destructive",
                });
                return;
            }
        }

        const validFiles = filesToProcess.filter(file =>
            ALLOWED_FILE_TYPES.some(type =>
                (file instanceof globalThis.File ? file.name : file as string).toLowerCase().endsWith(type)
            )
        );

        if (validFiles.length === 0) {
            toast({
                title: "No Valid Files",
                description: "No files of the allowed types were selected.",
                variant: "warning",
            });
            return;
        }

        const duplicateFiles = validFiles.filter(file => {
            const fileName = file instanceof globalThis.File ? file.name : (file as string).split('/').pop();
            return files.some(existingFile =>
                existingFile.name === fileName && existingFile.category === selectedCategory
            );
        });

        if (duplicateFiles.length > 0) {
            toast({
                title: "Warning",
                description: `${duplicateFiles.length} file(s) already exist in this category and will be skipped.`,
                variant: "warning",
            });
        }

        const newFiles = validFiles.filter(file => {
            const fileName = file instanceof globalThis.File ? file.name : (file as string).split('/').pop();
            return !files.some(existingFile =>
                existingFile.name === fileName && existingFile.category === selectedCategory
            );
        });

        if (newFiles.length === 0) {
            toast({
                title: "No New Files",
                description: "All selected files already exist in this category.",
                variant: "warning",
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
            formData.append('category', selectedCategory === 'all' ? 'uncategorized' : selectedCategory);
            console.log(file)
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
                    title: "Success",
                    description: `File ${file instanceof globalThis.File ? file.name : (file as string).split('/').pop()} moved successfully`,
                });
            } catch (error) {
                console.error('Error moving file:', error);
                toast({
                    title: "Error",
                    description: `Failed to move file ${file instanceof globalThis.File ? file.name : (file as string).split('/').pop()}`,
                    variant: "destructive",
                });
            }
        }
        setCurrentPage(1);

        if (validFiles.length < filesToProcess.length) {
            toast({
                title: "Some Files Skipped",
                description: `${filesToProcess.length - validFiles.length} file(s) were skipped due to invalid file type.`,
                variant: "warning",
            });
        }
    }, [selectedCategory, files, API_URL]);

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
                title: "Success",
                description: "File deleted successfully",
            })
        } catch (error) {
            console.error('Error deleting file:', error)
            toast({
                title: "Error",
                description: "Failed to delete file",
                variant: "destructive",
            })
        }
        setDeleteDialogOpen(false)
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
                title: "Success",
                description: "File moved successfully",
            })
        } catch (error) {
            console.error('Error moving file:', error)
            toast({
                title: "Error",
                description: "Failed to move file",
                variant: "destructive",
            })
        }
        setMoveDialogOpen(false)
        fetchFiles()
    }

    return (
        <div className="flex h-screen bg-background">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="container mx-auto max-w-[2000px]">
                        <h1 className="text-3xl font-bold gradient-text">Locker</h1>
                        <CategorySelector
                            selectedCategory={selectedCategory}
                            categories={categories}
                            isCategoriesLoading={isCategoriesLoading}
                            onCategoryChange={(value) => {
                                setSelectedCategory(value)
                                setCurrentPage(1)
                                if (rememberCategory) {
                                    localStorage.setItem('lastSelectedCategory', value)
                                }
                            }}
                            uploadImgFiles={uploadImgFiles}
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
                                onDeleteFile={(file) => {
                                    setSelectedFile(file)
                                    setDeleteDialogOpen(true)
                                }}
                                onMoveFile={(file) => {
                                    setSelectedFile(file)
                                    setMoveDialogOpen(true)
                                }}
                                onSelectImage={(imageUrl) => {
                                    setSelectedImage(imageUrl)
                                    setIsViewerOpen(true)
                                }}
                                apiUrl={API_URL}
                            />
                        )}
                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={totalPages}
                            imagesPerPage={imagesPerPage}
                            onPageChange={(page) => {
                                setCurrentPage(page)
                                fetchFiles()
                            }}
                            onImagesPerPageChange={(value) => {
                                setImagesPerPage(value)
                                setCurrentPage(1)
                                fetchFiles()
                            }}
                        />
                    </div>
                </main>
            </div>

            <MoveDialog
                isOpen={moveDialogOpen}
                onClose={() => setMoveDialogOpen(false)}
                onMove={handleMove}
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

            {isViewerOpen && selectedImage && (
                <ImageViewer
                    src={selectedImage}
                    alt="Selected image"
                    onClose={() => setIsViewerOpen(false)}
                />
            )}
        </div>
    )
}

