// EditCategoryDialog.tsx
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Pencil, ImagePlus, ImageOff } from 'lucide-react'
import { useTranslation } from "react-i18next"
import { DatabaseService } from "@/hooks/use-database"
import { open } from '@tauri-apps/plugin-dialog'

interface Category {
    name: string;
    file_count: number;
    size: number;
}

interface EditCategoryDialogProps {
    category: Category;
    onRename: (oldName: string, newName: string) => Promise<void>;
    onDelete: (name: string) => Promise<void>;
    onIconChange: () => Promise<void>;
}

export function EditCategoryDialog({
                                       category,
                                       onRename,
                                       onDelete,
                                       onIconChange
                                   }: EditCategoryDialogProps) {
    const [newName, setNewName] = useState(category.name);
    const [isOpen, setIsOpen] = useState(false);
    const { t } = useTranslation();
    const db = new DatabaseService();

    const handleRename = async () => {
        if (newName !== category.name) {
            await onRename(category.name, newName);
            setIsOpen(false);
        }
    };

    const handleDelete = async () => {
        await onDelete(category.name);
        setIsOpen(false);
    };

    const handleSelectIcon = async () => {
        try {
            const selected = await open({
                multiple: false,
                filters: [{
                    name: 'Images',
                    extensions: ['png', 'jpg', 'jpeg', 'jfif', 'webp']
                }]
            });

            if (selected && typeof selected === 'string') {
                await db.setCategoryIcon(category.name, selected as string);
                await onIconChange();
            }
        } catch (error) {
            console.error('Failed to set category icon:', error);
        }
    };

    const handleRemoveIcon = async () => {
        try {
            await db.setCategoryIcon(category.name, null);
            await onIconChange();
        } catch (error) {
            console.error('Failed to remove category icon:', error);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                    <Pencil className="h-4 w-4"/>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">{t('categories.edit.title')}</h4>
                        <p className="text-sm text-muted-foreground">
                            {t('categories.edit.description')}
                        </p>
                    </div>
                    <div className="grid gap-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('categories.edit.name')}</label>
                            <Input
                                id="name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('categories.edit.icon')}</label>
                            <div className="flex space-x-2">
                                <Button
                                    variant="outline"
                                    onClick={handleSelectIcon}
                                    className="flex-1"
                                >
                                    <ImagePlus className="h-4 w-4 mr-2" />
                                    {t('categories.edit.selectIcon')}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleRemoveIcon}
                                >
                                    <ImageOff className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <Button onClick={handleRename}>{t('categories.edit.rename')}</Button>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive">{t('categories.edit.delete')}</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>{t('categories.delete.title')}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {t('categories.delete.description')}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete}>
                                        {t('common.delete')}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}