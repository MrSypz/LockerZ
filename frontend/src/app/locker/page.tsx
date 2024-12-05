'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Sidebar } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { AlertCircle, Loader2 } from 'lucide-react'
import { useInView } from 'react-intersection-observer'

interface File {
    name: string;
    category: string;
    url: string;
    size: number;
    createdAt: string;
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

    const { ref, inView } = useInView({
        threshold: 0,
    })

    useEffect(() => {
        fetchFiles()
        fetchCategories()
    }, [])

    useEffect(() => {
        if (inView && currentPage < totalPages) {
            setCurrentPage(prevPage => prevPage + 1)
        }
    }, [inView, currentPage, totalPages])

    useEffect(() => {
        fetchFiles()
    }, [selectedCategory, currentPage])

    const fetchFiles = async () => {
        setIsLoading(true)
        try {
            const response = await fetch(`${API_URL}/files?page=${currentPage}&category=${selectedCategory}`)
            if (!response.ok) {
                throw new Error('Failed to fetch files')
            }
            const data: PaginatedResponse = await response.json()
            if (currentPage === 1) {
                setFiles(data.files)
            } else {
                setFiles(prevFiles => [...prevFiles, ...data.files])
            }
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

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        const allowedTypes = ['image/jpeg', 'image/png', 'image/jfif']
        if (!allowedTypes.includes(file.type)) {
            toast({
                title: "Error",
                description: "Only JPG, PNG, and JFIF files are allowed",
                variant: "destructive",
            })
            return
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('category', selectedCategory === 'all' ? 'uncategorized' : selectedCategory)

        try {
            const response = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData,
            })
            if (!response.ok) {
                throw new Error('File upload failed')
            }
            const data = await response.json()
            setFiles(prevFiles => [data.file, ...prevFiles])
            setCurrentPage(1) // Reset to first page
            toast({
                title: "Success",
                description: "File uploaded successfully",
            })
            // Clear the file input
            if (event.target) {
                event.target.value = ''
            }
        } catch (error) {
            console.error('Error uploading file:', error)
            toast({
                title: "Error",
                description: "Failed to upload file",
                variant: "destructive",
            })
        }
    }

    return (
        <div className="flex h-screen bg-background">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto p-6">
                    <h1 className="text-3xl font-bold mb-6 gradient-text">My Locker</h1>
                    <div className="flex justify-between items-center mb-4">
                        <Select
                            value={selectedCategory}
                            onValueChange={(value) => {
                                setSelectedCategory(value)
                                setFiles([])
                                setCurrentPage(1)
                            }}
                            disabled={isCategoriesLoading}
                        >
                            <SelectTrigger className="w-[180px]">
                                {isCategoriesLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <SelectValue placeholder="Select category" />
                                )}
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map(category => (
                                    <SelectItem key={category} value={category}>{category}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div>
                            <Input
                                type="file"
                                accept=".jpg,.png,.jfif"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="file-upload"
                            />
                            <label htmlFor="file-upload">
                                <Button as="span" onClick={() => document.getElementById('file-upload')?.click()}>
                                    Upload Image
                                </Button>
                            </label>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {files.map((file, index) => (
                            <Card key={index} className="overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="relative aspect-square">
                                        <Image
                                            src={`${API_URL}${file.url}`}
                                            alt={file.name}
                                            layout="fill"
                                            objectFit="cover"
                                            loading="lazy"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.src = '/placeholder-image.jpg';
                                                target.onerror = null;
                                            }}
                                        />
                                    </div>
                                    <div className="p-2">
                                        <p className="text-sm font-medium">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">{file.category}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(file.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    {isLoading && (
                        <div className="flex justify-center items-center h-24">
                            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                            <p>Loading more images...</p>
                        </div>
                    )}
                    {!isLoading && files.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-64">
                            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No images found in this category</p>
                        </div>
                    )}
                    <div ref={ref} style={{ height: '20px' }}></div>
                </main>
            </div>
        </div>
    )
}

