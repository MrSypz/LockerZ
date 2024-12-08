'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from "@/components/widget/Sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Pencil, Trash2, FolderPlus } from 'lucide-react'
import { toast } from "@/hooks/use-toast"

interface Category {
  name: string;
  fileCount: number;
  size: number;
}

export default function Category() {
  const [categories, setCategories] = useState<Category[]>([])
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newCategory, setNewCategory] = useState('')

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:3001/categories')
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
      const response = await fetch('http://localhost:3001/rename-category', {
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
      const response = await fetch('http://localhost:3001/delete-category', {
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
      const response = await fetch('http://localhost:3001/create-category', {
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
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold gradient-text">My Categories</h1>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <FolderPlus className="mr-2 h-4 w-4" />
                    Create Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Category</DialogTitle>
                    <DialogDescription>
                      Enter a name for the new category.
                    </DialogDescription>
                  </DialogHeader>
                  <Input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Category name"
                  />
                  <DialogFooter>
                    <Button onClick={handleCreateCategory}>Create</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                  <Card key={category.name} className="flex flex-col justify-between">
                    <CardContent className="pt-6">
                      {editingCategory === category.name ? (
                          <div className="flex items-center space-x-2">
                            <Input
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                className="flex-grow"
                            />
                            <Button onClick={() => handleSaveEdit(category.name)} size="sm">Save</Button>
                            <Button onClick={handleCancelEdit} variant="outline" size="sm">Cancel</Button>
                          </div>
                      ) : (
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">{category.name}</h3>
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
                                      "{category.name}" category and all its contents.
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
                          </div>
                      )}
                      <p className="text-sm text-muted-foreground mt-2">{category.fileCount} files</p>
                      <p className="text-sm text-muted-foreground">Size: {(category.size / 1024 / 1024).toFixed(2)} MB</p>
                    </CardContent>
                  </Card>
              ))}
            </div>
          </main>
        </div>
      </div>
  )
}

