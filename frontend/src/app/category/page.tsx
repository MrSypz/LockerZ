'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Pencil, Trash2, FolderPlus, ImageIcon, FolderOpen } from 'lucide-react'
import { toast } from "@/hooks/use-toast"
import { useTranslation } from "react-i18next"
import { API_URL } from "@/lib/zaphire"
import Image from 'next/image'

interface Category {
  name: string
  fileCount: number
  size: number
  imageUrl?: string
}

export default function Category() {
  const [categories, setCategories] = useState<Category[]>([])
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const { t } = useTranslation()

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/categories`)
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error('Error fetching categories:', error)
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (categoryName: string) => {
    setEditingCategory(categoryName)
    setNewCategoryName(categoryName)
  }

  const handleCancelEdit = () => {
    setEditingCategory(null)
    setNewCategoryName('')
  }

  const handleSaveEdit = async (oldName: string) => {
    try {
      const response = await fetch(`${API_URL}/rename-category`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ oldName, newName: newCategoryName }),
      })
      if (response.ok) {
        setEditingCategory(null)
        fetchCategories()
        toast({
          title: "Success",
          description: "Category renamed successfully",
        })
      } else {
        throw new Error('Failed to rename category')
      }
    } catch (error) {
      console.error('Error renaming category:', error)
      toast({
        title: "Error",
        description: "Failed to rename category",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (categoryName: string) => {
    try {
      const response = await fetch(`${API_URL}/delete-category`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: categoryName }),
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
      const response = await fetch(`${API_URL}/create-category`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newCategory }),
      })
      if (response.ok) {
        setNewCategory('')
        setIsCreateDialogOpen(false)
        fetchCategories()
        toast({
          title: "Success",
          description: "Category created successfully",
        })
      } else {
        throw new Error('Failed to create category')
      }
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
              <h1 className="text-3xl font-bold gradient-text">{t('category.page.head')}</h1>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <FolderPlus className="mr-2 h-4 w-4" />
                    {t('category.page.createcat')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {t('category.page.dialog.title')}
                    </DialogTitle>
                    <DialogDescription>
                      {t('category.page.dialog.desc')}
                    </DialogDescription>
                  </DialogHeader>
                  <Input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder={t('category.page.dialog.input')}
                  />
                  <DialogFooter>
                    <Button onClick={handleCreateCategory}>
                      {t('category.page.dialog.action')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            {categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
                  <FolderOpen className="h-24 w-24 text-muted-foreground mb-4" />
                  <p className="text-xl text-muted-foreground">No categories found. Create a new category to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categories.map((category) => (
                      <Card key={category.name} className="overflow-hidden">
                        <div className="relative h-48">
                          {category.imageUrl ? (
                              <Image
                                  src={category.imageUrl}
                                  alt={category.name}
                                  fill
                                  className="object-cover"
                              />
                          ) : (
                              <div className="flex items-center justify-center h-full bg-muted">
                                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                              </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          {editingCategory === category.name ? (
                              <div className="flex items-center space-x-2">
                                <Input
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    className="flex-grow"
                                />
                                <Button onClick={() => handleSaveEdit(category.name)} size="sm">
                                  Save
                                </Button>
                                <Button onClick={handleCancelEdit} variant="outline" size="sm">
                                  Cancel
                                </Button>
                              </div>
                          ) : (
                              <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">{category.name}</h3>
                                {category.name !== "uncategorized" && (
                                    <div className="space-x-2">
                                      <Button onClick={() => handleEdit(category.name)} size="sm" variant="outline">
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button size="sm" variant="outline">
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              This action cannot be undone. This will permanently delete the
                                              {category.name} category and all its contents.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(category.name)}>
                                              Delete
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                )}
                              </div>
                          )}
                          <div className="mt-2 space-y-1">
                            <p className="text-sm text-muted-foreground">{category.fileCount} files</p>
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

