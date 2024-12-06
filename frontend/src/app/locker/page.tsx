'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Sidebar } from "@/components/sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { AlertCircle, Loader2, Upload, Tag, ChevronLeft, ChevronRight } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { FileContextMenu } from '@/components/context-menu'
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

interface File {
    name: string;
    category: string;
    url: string;
    size: number;
    createdAt: string;
    tags?: string[];
}

interface PaginatedResponse {
    files: File[];
    currentPage: number;
    totalPages: number;
    totalFiles: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
    const [rememberPage, setRememberPage] = useState(false)
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const [isViewerOpen, setIsViewerOpen] = useState(false)


    useEffect(() => {
        const storedCategory = localStorage.getItem('selectedCategory')
        if (storedCategory) {
            setSelectedCategory(storedCategory)
        }

        const storedRememberPage = localStorage.getItem('rememberPage')
        if (storedRememberPage) {
            setRememberPage(storedRememberPage === 'true')
        }

        if (rememberPage) {
            const storedPage = localStorage.getItem('currentPage')
            if (storedPage) {
                setCurrentPage(parseInt(storedPage, 10))
            }
        }

        fetchFiles()
        fetchCategories()
    }, [])

    useEffect(() => {
        localStorage.setItem('selectedCategory', selectedCategory)
    }, [selectedCategory])

    useEffect(() => {
        if (rememberPage) {
            localStorage.setItem('currentPage', currentPage.toString())
        }
    }, [currentPage, rememberPage])

    useEffect(() => {
        if (!rememberPage || (rememberPage && currentPage === 1)) {
            fetchFiles()
        }
    }, [selectedCategory, currentPage, imagesPerPage, rememberPage])

    const fetchFiles = async () => {
        setIsLoading(true)
        try {
            const response = await fetch(`${API_URL}/files?page=${currentPage}&limit=${imagesPerPage}&category=${selectedCategory}`)
            if (!response.ok) {
                throw new Error('Failed to fetch files')
            }
            const data: PaginatedResponse = await response.json()
            setFiles(data.files)
            setTotalPages(data.totalPages)
            if (!rememberPage) {
                setCurrentPage(1)
            }
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

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jfif']
        // @ts-ignore
        const validFiles = acceptedFiles.filter(file => allowedTypes.includes(file.type))

        if (validFiles.length === 0) {
            toast({
                title: "Error",
                description: "Only JPG, PNG, and JFIF files are allowed",
                variant: "destructive",
            })
            return
        }

        for (const file of validFiles) {
            const formData = new FormData()
            // @ts-ignore
            formData.append('file', file)
            formData.append('category', selectedCategory === 'all' ? 'uncategorized' : selectedCategory)

            try {
                const response = await fetch(`${API_URL}/move-file`, {
                    method: 'POST',
                    body: formData,
                })
                if (!response.ok) {
                    throw new Error('File move failed')
                }
                const data = await response.json()
                setFiles(prevFiles => [data.file, ...prevFiles])
                toast({
                    title: "Success",
                    description: `File ${file.name} moved successfully`,
                })
            } catch (error) {
                console.error('Error moving file:', error)
                toast({
                    title: "Error",
                    description: `Failed to move file ${file.name}`,
                    variant: "destructive",
                })
            }
        }
        setCurrentPage(1)
    }, [selectedCategory])

    // @ts-ignore
    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

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
    }

    return (
        <div className="flex h-screen bg-background">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="container mx-auto max-w-[2000px]">
                        <h1 className="text-4xl font-bold mb-8 text-foreground tracking-tight">Locker</h1>
                        <div className="flex justify-between items-center mb-8">
                            <Select
                                value={selectedCategory}
                                onValueChange={(value) => {
                                    setSelectedCategory(value)
                                    if (!rememberPage) {
                                        setCurrentPage(1)
                                    }
                                }}
                                disabled={isCategoriesLoading}
                            >
                                <SelectTrigger className="w-[200px] bg-card text-card-foreground border-border">
                                    {isCategoriesLoading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                    ) : (
                                        <SelectValue placeholder="Select category"/>
                                    )}
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categories.map(category => (
                                        <SelectItem key={category} value={category}>{category}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div {...getRootProps()}
                                 className={`p-6 border-2 border-dashed rounded-lg transition-all duration-300 ease-in-out
                                    ${isDragActive ? 'border-primary bg-primary/50' : 'border-border hover:border-primary/50'}
                                    cursor-pointer bg-card text-card-foreground hover:scale-95`}
                            >
                                <input {...getInputProps()} />
                                <div className="flex flex-col items-center space-y-2">
                                    <Upload className="h-10 w-10" />
                                    <p className="text-center text-sm font-medium leading-5 max-w-[150px]">
                                        {isDragActive ? "Drag & Drop files here!" : "Drag & drop files or click to select"}
                                    </p>
                                </div>

                            </div>
                        </div>

                        <div
                            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 bg-background/50 backdrop-blur-sm rounded-lg border border-border">
                            {files.map((file, index) => (
                                <FileContextMenu
                                    key={`${file.category}-${file.name}`}
                                    file={file}
                                    onDelete={(file) => {
                                        // @ts-ignore
                                        setSelectedFile(file)
                                        setDeleteDialogOpen(true)
                                    }}
                                    onMove={(file) => {
                                        // @ts-ignore
                                        setSelectedFile(file)
                                        setMoveDialogOpen(true)
                                    }}
                                >
                                    <Card
                                        className="overflow-hidden transition-all duration-300 ease-in-out hover:ring-2 hover:ring-primary/50 bg-card border-border cursor-pointer"
                                        onClick={() => {
                                            setSelectedImage(`${API_URL}${file.url}`)
                                            setIsViewerOpen(true)
                                        }}
                                    >
                                        <CardContent className="p-0">
                                            <div className="relative aspect-[3/4]">
                                                <Image
                                                    src={`${API_URL}${file.url}`}
                                                    alt={file.name}
                                                    fill
                                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                                    className="object-cover"
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.src = '/placeholder-image.jpg';
                                                        target.onerror = null;
                                                    }}
                                                />
                                            </div>
                                            <div className="p-2 space-y-1">
                                                <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(file.createdAt).toLocaleDateString()}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{file.category}</p>
                                                <p className="text-xs text-muted-foreground italic truncate">
                                                    {file.tags?.length ? file.tags.join(', ') : 'No tags'}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </FileContextMenu>
                            ))}
                        </div>

                        {isLoading && (
                            <div className="flex justify-center items-center h-24 mt-8">
                                <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
                                <p className="text-foreground font-medium">Loading images...</p>
                            </div>
                        )}
                        {!isLoading && files.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-64 mt-8">
                                <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                                <p className="text-muted-foreground font-medium">No images found in this category</p>
                            </div>
                        )}

                        <div className="flex justify-between items-center mt-8">
                            <div className="flex items-center space-x-2">
                                <Button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    variant="outline"
                                    size="icon"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <Button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    variant="outline"
                                    size="icon"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                            <Select
                                value={imagesPerPage.toString()}
                                onValueChange={(value) => {
                                    setImagesPerPage(Number(value))
                                    setCurrentPage(1)
                                }}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Images per page" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10 per page</SelectItem>
                                    <SelectItem value="20">20 per page</SelectItem>
                                    <SelectItem value="40">40 per page</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
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


