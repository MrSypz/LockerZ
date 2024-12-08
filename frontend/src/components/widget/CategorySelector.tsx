import React, {DragEvent, useEffect, useState} from 'react'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import {Loader2, Upload} from 'lucide-react'
import {getCurrentWindow} from "@tauri-apps/api/window";
import { useTranslation } from 'react-i18next'


interface CategorySelectorProps {
    selectedCategory: string;
    categories: string[];
    isCategoriesLoading: boolean;
    onCategoryChange: (category: string) => void;
    uploadImgFiles: (droppedFiles?: string[]) => Promise<void>;
}

export function CategorySelector({
                                     selectedCategory,
                                     categories,
                                     isCategoriesLoading,
                                     onCategoryChange,
                                     uploadImgFiles
                                 }: CategorySelectorProps) {
    const [isDragActive, setIsDragActive] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        const setupDragDropListener = async () => {
            return await getCurrentWindow().onDragDropEvent((event) => {
                if (event.payload.type === 'over') {
                    setIsDragActive(true);
                } else if (event.payload.type === 'drop') {
                    // console.log('User dropped files:', event.payload.paths);
                    uploadImgFiles(event.payload.paths);
                    setIsDragActive(false);
                } else {
                    setIsDragActive(false);
                }
            });
        };

        setupDragDropListener().then((unlisten) => {
            return () => {
                unlisten();
            };
        });
    }, []);

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragActive(true);
    };

    const handleDragLeave = () => {
        setIsDragActive(false);
    };

    const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
        // only for mimic the real thing is one useEffect
        e.preventDefault();
        setIsDragActive(false);
    };

    const handleClick = () => {
        uploadImgFiles();  // Handle click if needed to upload files
    };

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
                    {categories.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
                className={`p-6 border-2 border-dashed rounded-lg transition-all duration-300 ease-in-out
                    ${isDragActive ? 'border-primary bg-primary/50' : 'border-border hover:border-primary/50'}
                    cursor-pointer bg-card text-card-foreground hover:scale-95`}
            >
                <div className="flex flex-col items-center space-y-2">
                    <Upload className="h-10 w-10" />
                    <p
                        className="text-center text-sm font-medium leading-5 max-w-[150px] truncate"
                        title={isDragActive ? t('category.dragdrop.idle') : t('category.dragdrop.hover')}
                    >
                        {isDragActive ? t('category.dragdrop.idle') : t('category.dragdrop.hover')}
                    </p>
                </div>
            </div>
        </div>
    );
}
