import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Upload } from 'lucide-react'
import { useDropzone } from 'react-dropzone'

interface CategorySelectorProps {
    selectedCategory: string
    categories: string[]
    isCategoriesLoading: boolean
    onCategoryChange: (category: string) => void
    onDrop: (acceptedFiles: File[]) => void
}

export function CategorySelector({
                                     selectedCategory,
                                     categories,
                                     isCategoriesLoading,
                                     onCategoryChange,
                                     onDrop
                                 }: CategorySelectorProps) {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

    return (
        <div className="flex justify-between items-center mb-8">
            <Select
                value={selectedCategory}
                onValueChange={onCategoryChange}
                disabled={isCategoriesLoading}
            >
                <SelectTrigger className="w-[200px] bg-card text-card-foreground border-border">
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
    )
}

