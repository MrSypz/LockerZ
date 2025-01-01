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
import {Pencil, Trash2, FolderPlus, ImageIcon, FolderOpen} from 'lucide-react'
import {toast} from "@/hooks/use-toast"
import {useTranslation} from "react-i18next"
import {API_URL} from "@/lib/zaphire"
import {invoke} from '@tauri-apps/api/core'

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
    // onChangePlaceholder: (name: string, imageUrl: string) => Promise<void>
}

function EditCategoryPopover({category, onRename, onDelete}: EditCategoryPopoverProps) {
    const [newName, setNewName] = useState(category.name)
    const [isOpen, setIsOpen] = useState(false)
    // const [isImageSelectionOpen, setIsImageSelectionOpen] = useState(false)
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

    const handleChangePlaceholder = async (categoryName: string, imageUrl: string) => {
        try {
            const response = await fetch(`${API_URL}/update-category-placeholder`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({name: categoryName, imageUrl}),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update category placeholder');
            }

            const data = await response.json();
            if (data.success) {
                toast({
                    title: "Success",
                    description: "Category placeholder updated successfully",
                });
            } else {
                throw new Error('Failed to update category placeholder');
            }
        } catch (error) {
            console.error('Error updating category placeholder:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update category placeholder",
                variant: "destructive",
            });
        }
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
                        {/*<Button onClick={() => setIsImageSelectionOpen(true)}>{t('categories.edit.changePlaceholder')}</Button>*/}
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
            {/*<ImageSelectionModal*/}
            {/*    isOpen={isImageSelectionOpen}*/}
            {/*    onClose={() => setIsImageSelectionOpen(false)}*/}
            {/*    onSelect={handleChangePlaceholder}*/}
            {/*    categoryName={category.name}*/}
            {/*/>*/}
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

    async function handleRename(oldName: string, newName: string) {
        try {
            await invoke('rename_category', {
                oldName: oldName,
                newName: newName
            });
            await fetchCategories();
            toast({
                title: "Success",
                description: "Category renamed successfully",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to rename category",
                variant: "destructive",
            });
        }
    }

    const handleDelete = async (categoryName: string) => {
        try {
            const response = await fetch(`${API_URL}/delete-category`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({name: categoryName}),
            })
            if (response.ok) {
                fetchCategories()
                toast({
                    title: "Success",
                    description: "Category deleted successfully",
                })
            } else {
                throw new Error('Failed to delete category')
            }
        } catch (error) {
            console.error('Error deleting category:', error)
            toast({
                title: "Error",
                description: "Failed to delete category",
                variant: "destructive",
            })
        }
    }

    const handleChangePlaceholder = async (categoryName: string, imageUrl: string) => {
        try {
            const response = await fetch(`${API_URL}/update-category-placeholder`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({name: categoryName, imageUrl}),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update category placeholder');
            }

            const data = await response.json();
            if (data.success) {
                fetchCategories();
                toast({
                    title: "Success",
                    description: "Category placeholder updated successfully",
                });
            } else {
                throw new Error('Failed to update category placeholder');
            }
        } catch (error) {
            console.error('Error updating category placeholder:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update category placeholder",
                variant: "destructive",
            });
        }
    }
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
        <div className="flex h-screen bg-background">
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
                                    {/*<div className="relative h-48">*/}
                                    {/*  {category.imageUrl ? (*/}
                                    {/*      <OptimizedImage*/}
                                    {/*          src={`${category.imageUrl}`}*/}
                                    {/*          alt={category.name}*/}
                                    {/*          width={350}*/}
                                    {/*          height={400}*/}
                                    {/*          quality={100}*/}
                                    {/*      />*/}
                                    {/*  ) : (*/}
                                    {/*      <div className="flex items-center justify-center h-full bg-muted">*/}
                                    {/*        <ImageIcon className="h-12 w-12 text-muted-foreground" />*/}
                                    {/*      </div>*/}
                                    {/*  )}*/}
                                    {/*</div>*/}
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold">{category.name}</h3>
                                            {category.name !== "uncategorized" && (
                                                <EditCategoryPopover
                                                    category={category}
                                                    onRename={handleRename}
                                                    onDelete={handleDelete}
                                                    // onChangePlaceholder={handleChangePlaceholder}
                                                />
                                            )}
                                        </div>
                                        <div className="mt-2 space-y-1">
                                            <p className="text-sm text-muted-foreground">{category.file_count} files</p>
                                            <p className="text-sm text-muted-foreground">Size: {(category.size / 1024 / 1024).toFixed(2)} MB</p>
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

