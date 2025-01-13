'use client'

import {useState, useEffect} from 'react'
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Card, CardContent} from "@/components/ui/card"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog"
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover"
import {Pencil, FolderPlus, FolderOpen} from 'lucide-react'
import {toast} from "@/hooks/use-toast"
import {useTranslation} from "react-i18next"
import {invoke} from '@tauri-apps/api/core'
import {formatBytes} from "@/components/widget/Dashboard";

interface Category {
    name: string
    file_count: number
    size: number
    imageUrl?: string
}

interface EditCategoryPopoverProps {
    category: Category
    onRename: (oldName: string, newName: string) => Promise<void>
    onDelete: (name: string) => Promise<void>
}

function EditCategoryPopover({category, onRename, onDelete}: EditCategoryPopoverProps) {
    const [newName, setNewName] = useState(category.name)
    const [isOpen, setIsOpen] = useState(false)
    const {t} = useTranslation()

    const handleRename = async () => {
        if (newName !== category.name) {
            await onRename(category.name, newName)
            setIsOpen(false)
        }
    }

    const handleDelete = async () => {
        await onDelete(category.name)
        setIsOpen(false)
    }

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
                        <Input
                            id="name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />
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
    )
}

export default function Category() {
    const [categories, setCategories] = useState<Category[]>([])
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [newCategory, setNewCategory] = useState('')
    const {t} = useTranslation()

    useEffect(() => {
        fetchCategories()
    }, [])

    const fetchCategories = async () => {
        try {
            const data: Category[] = await invoke("get_categories");
            setCategories(data); // `data` is the Vec<Category> from Rust
        } catch (error) {
            console.error("Error fetching categories:", error);
            toast({
                title: "Error",
                description: "Failed to fetch categories",
                variant: "destructive",
            });
        }
    };

    const handleRename = async (oldName: string, newName: string) => {
        try {
            const result: string = await invoke('rename_category', {
                oldName: oldName,
                newName: newName
            });
            await fetchCategories();
            toast({
                title: "Success",
                description: result, // Use the backend's success message
            });
        } catch (error: any) {
            console.error("Error renaming category:", error);

            const errorMessage = error?.message || "Failed to rename category";
            toast({
                title: "Error",
                description: errorMessage, // Use the backend's error message
                variant: "destructive",
            });
        }
    };

    const handleDelete = async (categoryName: string) => {
        try {
            const result: string = await invoke('delete_category', { name: categoryName });
            await fetchCategories();
            toast({
                title: "Success",
                description: result, // Use the success message from the backend
            });
        } catch (error: any) {
            const errorMessage = error?.message || "Failed to delete";
            if (errorMessage.includes("Failed to delete")) {
                toast({
                    title: "Warning",
                    description: `Cannot delete category '${categoryName}' because it is not empty. Please remove files inside first.`,
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Error",
                    description: errorMessage,
                    variant: "destructive",
                });
            }
        }
    };


    const handleCreateCategory = async () => {
        if (!newCategory.trim()) {
            toast({
                title: "Error",
                description: "Category name cannot be empty",
                variant: "destructive",
            })
            return
        }

        try {
            await invoke("create_category", {
                name: newCategory
            })
            setNewCategory('')
            setIsCreateDialogOpen(false)
            fetchCategories()
            toast({
                title: "Success",
                description: "Category created successfully",
            })
        } catch (error) {
            console.error('Error creating category:', error)
            toast({
                title: "Error",
                description: "Failed to create category",
                variant: "destructive",
            })
        }
    }


    return (
        <div className="flex h-screen">
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold gradient-text">{t('categories.page.head')}</h1>
                        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <FolderPlus className="mr-2 h-4 w-4"/>
                                    {t('categories.page.createcat')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>
                                        {t('categories.page.dialog.title')}
                                    </DialogTitle>
                                    <DialogDescription>
                                        {t('categories.page.dialog.desc')}
                                    </DialogDescription>
                                </DialogHeader>
                                <Input
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    placeholder={t('categories.page.dialog.input')}
                                />
                                <DialogFooter>
                                    <Button onClick={handleCreateCategory}>
                                        {t('categories.page.dialog.action')}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    {categories.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
                            <FolderOpen className="h-24 w-24 text-muted-foreground mb-4"/>
                            <p className="text-xl text-muted-foreground">No categories found. Create a new category to
                                get started.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {categories.map((category) => (
                                <Card key={category.name} className="overflow-hidden">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold">{category.name}</h3>
                                            {category.name !== "uncategorized" && (
                                                <EditCategoryPopover
                                                    category={category}
                                                    onRename={handleRename}
                                                    onDelete={handleDelete}
                                                />
                                            )}
                                        </div>
                                        <div className="mt-2 space-y-1">
                                            <p className="text-sm text-muted-foreground">{category.file_count} files</p>
                                            <p className="text-sm text-muted-foreground">Size: {(formatBytes(category.size))}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}

