import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ImageIcon, User, Crown } from 'lucide-react';
import { motion } from "framer-motion";
import { formatBytes } from "@/components/widget/Dashboard";
import { EditCategoryDialog } from "@/components/dialog/category/EditCategoryDialog";
import { DatabaseService } from "@/hooks/use-database";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { Badge } from "@/components/ui/badge";
import { useSharedSettings } from "@/utils/SettingsContext";

interface Category {
    name: string;
    file_count: number;
    size: number;
}

interface ImportInfo {
    owner: string;
    original_name: string;
    imported_at: string;
}

interface CategoryCardProps {
    category: Category;
    onRename: (oldName: string, newName: string) => Promise<void>;
    onDelete: (name: string) => Promise<void>;
    onRefresh: () => Promise<void>;
}

export function CategoryCard({ category, onRename, onDelete, onRefresh }: CategoryCardProps) {
    const [categoryIcon, setCategoryIcon] = useState<string | null>(null);
    const [importInfo, setImportInfo] = useState<ImportInfo | null>(null);
    const { settings } = useSharedSettings();
    const db = new DatabaseService();

    useEffect(() => {
        const icon = db.getCategoryIcon(category.name).then(icon => {
            if (icon?.relative_path && icon?.filename)
                setCategoryIcon(`${icon.relative_path}/${icon.filename}`);
            else setCategoryIcon(null);
        }).catch(() => setCategoryIcon(null));

        invoke<ImportInfo | null>('get_import_info', { categoryName: category.name })
            .then(setImportInfo)
            .catch(() => setImportInfo(null));
    }, [category.name]);

    const isOwn = !importInfo;
    const ownerName = settings?.owner_name || 'You';

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
                        <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
                            {categoryIcon ? (
                                <img src={convertFileSrc(categoryIcon)} alt={category.name} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                                <h3 className="text-lg font-semibold truncate">{category.name}</h3>
                                {category.name !== "uncategorized" && (
                                    <EditCategoryDialog
                                        category={category}
                                        onRename={onRename}
                                        onDelete={onDelete}
                                        onIconChange={onRefresh}
                                    />
                                )}
                            </div>

                            {/* Ownership credit */}
                            <div className="mt-1">
                                {isOwn ? (
                                    <Badge variant="outline" className="text-[10px] gap-1 text-emerald-500 border-emerald-500/40 bg-emerald-500/10">
                                        <Crown className="h-2.5 w-2.5" />
                                        {ownerName}
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-[10px] gap-1 text-sky-400 border-sky-400/40 bg-sky-400/10">
                                        <User className="h-2.5 w-2.5" />
                                        from {importInfo!.owner || 'unknown'}
                                    </Badge>
                                )}
                            </div>

                            <div className="mt-2 space-y-0.5">
                                <p className="text-sm text-muted-foreground">{category.file_count} files</p>
                                <p className="text-sm text-muted-foreground">Size: {formatBytes(category.size)}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}