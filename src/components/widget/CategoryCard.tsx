// CategoryCard.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import {ImageIcon, SeparatorVertical} from 'lucide-react';
import { motion } from "framer-motion";
import { formatBytes } from "@/components/widget/Dashboard";
import { EditCategoryDialog } from "@/components/dialog/category/EditCategoryDialog";
import { DatabaseService } from "@/hooks/use-database";
import {OptimizedImage} from "@/components/widget/ImageProcessor";
import { Separator } from "@/components/ui/separator"

interface Category {
    name: string;
    file_count: number;
    size: number;
}

interface CategoryCardProps {
    category: Category;
    onRename: (oldName: string, newName: string) => Promise<void>;
    onDelete: (name: string) => Promise<void>;
    onRefresh: () => Promise<void>;
}

export function CategoryCard({ category, onRename, onDelete, onRefresh }: CategoryCardProps) {
    const [categoryIcon, setCategoryIcon] = useState<string | null>(null);
    const db = new DatabaseService();

    useEffect(() => {
        loadCategoryIcon();
    }, [category.name]);

    const loadCategoryIcon = async () => {
        try {
            const icon = await db.getCategoryIcon(category.name);
            if (icon && icon.relative_path && icon.filename) {
                setCategoryIcon(`${icon.relative_path}/${icon.filename}`);
            } else {
                setCategoryIcon(null);
            }
        } catch (error) {
            console.error('Failed to load category icon:', error);
            setCategoryIcon(null);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
        >
            <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
                <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                            {categoryIcon ? (
                                <OptimizedImage src={categoryIcon} alt={category.name} width={300} height={300}></OptimizedImage>
                            ) : (
                                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                            )}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">{category.name}</h3>
                                {category.name !== "uncategorized" && (
                                    <EditCategoryDialog
                                        category={category}
                                        onRename={onRename}
                                        onDelete={onDelete}
                                        onIconChange={onRefresh}
                                    />
                                )}
                            </div>
                            <div className="mt-2 space-y-1">
                                <p className="text-sm text-muted-foreground">
                                    {category.file_count} files
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Size: {formatBytes(category.size)}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}