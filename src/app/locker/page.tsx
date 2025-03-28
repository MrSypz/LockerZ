"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "@/hooks/use-toast"
import { Loader2, AlertCircle, Upload } from "lucide-react"
import { open } from "@tauri-apps/plugin-dialog"
import { invoke } from "@tauri-apps/api/core"
import { MoveDialog } from "@/components/widget/Move-dialog"
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
import { FileGrid } from "@/components/widget/FileGrid"
import CategorySelector from "@/components/widget/CategorySelector"
import { PaginationControls } from "@/components/widget/PaginationControls"
import type { File, FileResponse, Category } from "@/types/file"
import { useTranslation } from "react-i18next"
import { useSharedSettings } from "@/utils/SettingsContext"
import { ALLOWED_FILE_TYPES, IMAGES_PER_PAGE_STORAGE_KEY, PAGE_STORAGE_KEY } from "@/lib/localstoragekey"
import { TagManagerDialog } from "@/components/widget/TagManagerDialog"
import { BulkTagManagerDialog } from "@/components/widget/BulkTagManagerDialog"
import { BatchProcessingProvider } from "@/components/widget/BatchProcessingProvider"
import { DragAndDropProvider } from "@/components/widget/DragAndDropProvider"
import { DragDropZone } from "@/components/widget/DragDropZone"
import { motion } from "framer-motion"

interface FileMoveResponse {
    success: boolean
    file: {
        name: string
        category: string
        filepath: string
        size: number
        last_modified: string
    }
}

export default function Locker() {
    const { t } = useTranslation()
    const { settings } = useSharedSettings()

    const [files, setFiles] = useState<File[]>([])
    const [allFiles, setAllFiles] = useState<File[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [selectedCategory, setSelectedCategory] = useState<string>(() => {
        if (typeof window !== "undefined" && settings.rememberCategory)
            return localStorage.getItem("lastSelectedCategory") || "all"
        return "all"
    })
    const [isLoading, setIsLoading] = useState(true)
    const [isCategoriesLoading, setIsCategoriesLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [moveDialogOpen, setMoveDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [imagesPerPage, setImagesPerPage] = useState(() => {
        const savedImagesPerPage = localStorage.getItem(IMAGES_PER_PAGE_STORAGE_KEY)
        return savedImagesPerPage ? Number.parseInt(savedImagesPerPage, 10) : 10
    })
    const [rememberCategory] = useState(settings.rememberCategory)

    const [tagManagerOpen, setTagManagerOpen] = useState(false)
    const [selectedFileForTags, setSelectedFileForTags] = useState<File | null>(null)

    const [bulkMoveDialogOpen, setBulkMoveDialogOpen] = useState(false)
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
    const [bulkTagDialogOpen, setBulkTagDialogOpen] = useState(false)
    const [selectedFilesForBulkAction, setSelectedFilesForBulkAction] = useState<File[]>([])

    async function show_in_folder(path: string) {
        await invoke("show_in_folder", { path })
    }

    const fetchAllFiles = useCallback(async () => {
        setIsLoading(true)
        try {
            const data: FileResponse = await invoke("get_files", {
                page: 1,
                limit: -1,
                category: selectedCategory,
            })
            setAllFiles(data.files)

            // Calculate initial page files
            const startIndex = 0
            const endIndex = Math.min(imagesPerPage, data.files.length)
            setFiles(data.files.slice(startIndex, endIndex))

            // Calculate total pages
            setTotalPages(Math.ceil(data.files.length / imagesPerPage))
        } catch (error) {
            toast({
                title: t("toast.titleType.error"),
                description: "Failed to fetch all files",
                variant: "destructive",
            })
            setAllFiles([])
            setFiles([])
            setTotalPages(0)
        } finally {
            setIsLoading(false)
        }
    }, [selectedCategory, imagesPerPage, t])

    const fetchCategories = useCallback(async () => {
        setIsCategoriesLoading(true)
        try {
            const data: Category = await invoke("get_categories")
            if (!data.ok) {
                new Error("Failed to fetch categories")
            }
            setCategories(data.map((category: { name: string }) => category.name))
        } catch (error) {
            toast({
                title: t("toast.titleType.error"),
                description: "Failed to fetch categories",
                variant: "destructive",
            })
        } finally {
            setIsCategoriesLoading(false)
        }
    }, [t])

    const handleFileDrop = useCallback(
        async (droppedFiles?: string[]) => {
            let filesToProcess: (globalThis.File | string)[] = []

            if (droppedFiles?.length > 0) {
                filesToProcess = droppedFiles
            } else {
                try {
                    const selectedFiles = await open({
                        multiple: true,
                        directory: false,
                        filters: [
                            {
                                name: "Images",
                                extensions: ["png", "jpg", "jpeg", "jfif", "webp"],
                            },
                        ],
                    })
                    if (!selectedFiles?.length) return
                    filesToProcess = selectedFiles
                } catch (error) {
                    console.error("File dialog error:", error)
                    return
                }
            }

            const getFileName = (file: globalThis.File | string): string =>
                file instanceof globalThis.File ? file.name : file.replace(/^.*[\\/]/, "")

            const validFiles = filesToProcess.filter((file) =>
                ALLOWED_FILE_TYPES.some((type) => getFileName(file).toLowerCase().endsWith(type)),
            )

            if (!validFiles.length) {
                toast({
                    title: "Invalid Files",
                    description: "No valid image files were selected.",
                    variant: "destructive",
                })
                return
            }

            const category = selectedCategory === "all" ? "uncategorized" : selectedCategory

            const duplicateFiles = validFiles.filter((file) =>
                files.some((existingFile) => existingFile.name === getFileName(file) && existingFile.category === category),
            )

            if (duplicateFiles.length === validFiles.length) {
                toast({
                    title: "Duplicate Files",
                    description: "All selected files already exist in this category.",
                    variant: "destructive",
                })
                return
            }

            for (const file of validFiles) {
                try {
                    let response
                    if (file instanceof globalThis.File) {
                        const buffer = await file.arrayBuffer()
                        response = await invoke<FileMoveResponse>("save_and_move_file", {
                            fileName: file.name,
                            fileContent: Array.from(new Uint8Array(buffer)),
                            category: category,
                        })
                    } else {
                        response = await invoke<FileMoveResponse>("move_file", {
                            originalPath: file,
                            category: category,
                        })
                    }
                    setFiles((prevFiles) => [response.file, ...prevFiles])
                } catch (error) {
                    console.error("Error processing file:", error)
                }
            }

            await fetchAllFiles()
        },
        [selectedCategory, files, fetchAllFiles],
    )

    const handleDelete = async (file: File) => {
        try {
            await invoke("delete_file", {
                category: file.category,
                name: file.name,
            })

            setFiles((prevFiles) => prevFiles.filter((f) => f.name !== file.name || f.category !== file.category))
            setAllFiles((prevFiles) => prevFiles.filter((f) => f.name !== file.name || f.category !== file.category))

            toast({
                title: t("toast.titleType.success"),
                description: `${file.name} deleted successfully`,
            })
        } catch (error) {
            toast({
                title: t("toast.titleType.error"),
                description: `Failed to delete Image ${file.name}`,
                variant: "destructive",
            })
        }
        setDeleteDialogOpen(false)
    }

    const handleMove = async (newCategory: string) => {
        if (!selectedFile) return
        try {
            await invoke("move_file_category", {
                oldCategory: selectedFile.category,
                newCategory,
                fileName: selectedFile.name,
            })
            setFiles((prevFiles) =>
                prevFiles.filter((f) => f.name !== selectedFile.name || f.category !== selectedFile.category),
            )
            toast({
                title: t("toast.titleType.success"),
                description: `File ${selectedFile.name} moved to ${newCategory}successfully`,
            })
        } catch (error) {
            toast({
                title: t("toast.titleType.error"),
                description: "Failed to move file",
                variant: "destructive",
            })
        }
        setMoveDialogOpen(false)
        await fetchAllFiles()
    }

    const handleImagesPerPageChange = useCallback(
        (value: number) => {
            setImagesPerPage(value)
            setCurrentPage(1)
            localStorage.setItem(IMAGES_PER_PAGE_STORAGE_KEY, value.toString())
            localStorage.setItem(PAGE_STORAGE_KEY, "1")

            const startIndex = 0
            const endIndex = Math.min(value, allFiles.length)
            setFiles(allFiles.slice(startIndex, endIndex))
            setTotalPages(Math.ceil(allFiles.length / value))
        },
        [allFiles],
    )

    const handlePageChange = useCallback(
        (page: number) => {
            setCurrentPage(page)
            localStorage.setItem(PAGE_STORAGE_KEY, page.toString())

            const startIndex = (page - 1) * imagesPerPage
            const endIndex = Math.min(startIndex + imagesPerPage, allFiles.length)

            setFiles(allFiles.slice(startIndex, endIndex))
        },
        [allFiles, imagesPerPage],
    )

    const handleTagsAction = (file: File) => {
        setSelectedFileForTags(file)
        setTagManagerOpen(true)
    }

    const onCategoryChange = useCallback(
        async (value: string) => {
            setIsLoading(true)
            setSelectedCategory(value)
            setCurrentPage(1)

            localStorage.setItem(PAGE_STORAGE_KEY, "1")
            if (rememberCategory) {
                localStorage.setItem("lastSelectedCategory", value)
            }

            try {
                const data: FileResponse = await invoke("get_files", {
                    page: 1,
                    limit: -1,
                    category: value,
                })

                setAllFiles(data.files)

                const startIndex = 0
                const endIndex = Math.min(imagesPerPage, data.files.length)
                setFiles(data.files.slice(startIndex, endIndex))

                // Calculate total pages
                setTotalPages(Math.ceil(data.files.length / imagesPerPage))

                // Calculate total pages
                setTotalPages(Math.ceil(data.files.length / imagesPerPage))
            } catch (error) {
                console.error("Error changing category:", error)
                setAllFiles([])
                setFiles([])
                setTotalPages(0)
                toast({
                    title: t("toast.titleType.error"),
                    description: "Failed to fetch files for category",
                    variant: "destructive",
                })
            } finally {
                setIsLoading(false)
            }
        },
        [imagesPerPage, rememberCategory, t],
    )

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                await fetchCategories()

                let initialCategory = "all"
                if (rememberCategory) {
                    const lastCategory = localStorage.getItem("lastSelectedCategory")
                    if (lastCategory) {
                        initialCategory = lastCategory
                    }
                }

                await onCategoryChange(initialCategory)
            } catch (error) {
                console.error("Error loading initial data:", error)
            }
        }

        loadInitialData()
    }, [fetchCategories, onCategoryChange, rememberCategory])

    const confirmBulkDelete = async () => {
        try {
            const deletePromises = selectedFilesForBulkAction.map((file) =>
                invoke("delete_file", {
                    category: file.category,
                    name: file.name,
                }),
            )

            await Promise.all(deletePromises)

            // Update the files state to remove deleted files
            const deletedFileKeys = new Set(selectedFilesForBulkAction.map((file) => `${file.category}-${file.name}`))

            setFiles((prevFiles) => prevFiles.filter((file) => !deletedFileKeys.has(`${file.category}-${file.name}`)))
            setAllFiles((prevFiles) => prevFiles.filter((file) => !deletedFileKeys.has(`${file.category}-${file.name}`)))

            toast({
                title: t("toast.titleType.success"),
                description: t("locker.bulk.deleteSuccess", { count: selectedFilesForBulkAction.length }),
            })

            // Clear selection after successful deletion
            fileGridRef.current?.clearSelection()
        } catch (error) {
            toast({
                title: t("toast.titleType.error"),
                description: t("locker.bulk.deleteError"),
                variant: "destructive",
            })
        }
        setBulkDeleteDialogOpen(false)
        setSelectedFilesForBulkAction([])
    }

    const handleBulkMoveConfirm = async (newCategory: string) => {
        try {
            const movePromises = selectedFilesForBulkAction.map((file) =>
                invoke("move_file_category", {
                    oldCategory: file.category,
                    newCategory,
                    fileName: file.name,
                }),
            )

            await Promise.all(movePromises)

            // Update files state
            const movedFileKeys = new Set(selectedFilesForBulkAction.map((file) => `${file.category}-${file.name}`))

            setFiles((prevFiles) => prevFiles.filter((file) => !movedFileKeys.has(`${file.category}-${file.name}`)))

            toast({
                title: t("toast.titleType.success"),
                description: t("locker.bulk.moveSuccess", {
                    count: selectedFilesForBulkAction.length,
                    category: newCategory,
                }),
            })

            await fetchAllFiles()

            // Clear selection after successful move
            fileGridRef.current?.clearSelection()
        } catch (error) {
            toast({
                title: t("toast.titleType.error"),
                description: t("locker.bulk.moveError"),
                variant: "destructive",
            })
        }
        setBulkMoveDialogOpen(false)
        setSelectedFilesForBulkAction([])
    }

    const fileGridRef = useRef<{ clearSelection: () => void } | null>(null)

    return (
        <BatchProcessingProvider>
            <DragAndDropProvider onFilesDrop={handleFileDrop}>
                <div className="flex h-screen">
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <main className="flex-1 overflow-y-auto p-4 md:p-8">
                            <div className="container mx-auto max-w-[2000px]">
                                <h1 className="text-3xl font-bold ">Locker</h1>
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
                                ) : !files || files.length === 0 ? (
                                    <DragDropZone className="h-64 mt-8 relative" hasContent={false}>
                                        <div className="absolute inset-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 opacity-10 pointer-events-none">
                                            {[...Array(10)].map((_, index) => (
                                                <motion.div
                                                    key={index}
                                                    className="aspect-[2/3] rounded-lg bg-muted"
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{
                                                        opacity: 1,
                                                        scale: 1,
                                                        transition: {
                                                            delay: index * 0.1,
                                                            duration: 0.2,
                                                        },
                                                    }}
                                                />
                                            ))}
                                        </div>

                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.3 }}
                                                className="flex flex-col items-center space-y-4"
                                            >
                                                <AlertCircle className="w-12 h-12 text-muted-foreground" />
                                                <p className="text-muted-foreground font-medium text-center">
                                                    {t("categories.imageSelection.noImages")}
                                                </p>
                                                <Upload className="h-10 w-10 text-gray-400 animate-bounce" />
                                            </motion.div>
                                        </div>
                                    </DragDropZone>
                                ) : (
                                    <FileGrid
                                        ref={fileGridRef}
                                        allFiles={allFiles}
                                        onViewFileAction={async (file) => {
                                            await show_in_folder(file.filepath)
                                        }}
                                        onDeleteFileAction={(files) => {
                                            if (Array.isArray(files)) {
                                                setSelectedFilesForBulkAction(files)
                                                setBulkDeleteDialogOpen(true)
                                            } else {
                                                setSelectedFile(files)
                                                setDeleteDialogOpen(true)
                                            }
                                        }}
                                        onMoveFileAction={(files) => {
                                            if (Array.isArray(files)) {
                                                setSelectedFilesForBulkAction(files)
                                                setBulkMoveDialogOpen(true)
                                            } else {
                                                setSelectedFile(files)
                                                setMoveDialogOpen(true)
                                            }
                                        }}
                                        onTagAction={(files) => {
                                            if (Array.isArray(files)) {
                                                setSelectedFilesForBulkAction(files)
                                                setBulkTagDialogOpen(true)
                                            } else {
                                                setSelectedFileForTags(files)
                                                setTagManagerOpen(true)
                                            }
                                        }}
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
                                            setTagManagerOpen(false)
                                            setSelectedFileForTags(null)
                                            await fetchAllFiles()
                                        }}
                                    />
                                )}
                                {selectedFilesForBulkAction.length > 0 && (
                                    <BulkTagManagerDialog
                                        files={selectedFilesForBulkAction}
                                        isOpen={bulkTagDialogOpen}
                                        onClose={async () => {
                                            setBulkTagDialogOpen(false)
                                            fileGridRef.current?.clearSelection()
                                            await fetchAllFiles()
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
                        currentCategory={selectedFile?.category || ""}
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

                    <MoveDialog
                        isOpen={bulkMoveDialogOpen}
                        onCloseAction={() => setBulkMoveDialogOpen(false)}
                        onMoveAction={handleBulkMoveConfirm}
                        categories={categories}
                        currentCategory={selectedFilesForBulkAction[0]?.category || ""}
                        title={t("locker.bulk.moveTitle", { count: selectedFilesForBulkAction.length })}
                    />

                    <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t("locker.bulk.deleteTitle")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {t("locker.bulk.deleteDescription", { count: selectedFilesForBulkAction.length })}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={confirmBulkDelete}
                                >
                                    {t("common.delete")}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </DragAndDropProvider>
        </BatchProcessingProvider>
    )
}

