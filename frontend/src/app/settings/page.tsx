'use client'

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sidebar } from "@/components/sidebar"
import { toast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export default function Settings() {
  const [folderPath, setFolderPath] = useState('')
  const [newFolderPath, setNewFolderPath] = useState('')
  const [rememberCategory, setRememberCategory] = useState(false)
  const [rememberPage, setRememberPage] = useState(false)

  useEffect(() => {
    fetchCurrentSettings()
  }, [])

  const fetchCurrentSettings = async () => {
    try {
      const response = await fetch('http://localhost:3001/get-settings')
      const data = await response.json()
      setFolderPath(data.folderPath)
      setRememberCategory(data.rememberCategory)
      setRememberPage(data.rememberPage)
    } catch (error) {
      console.error('Error fetching current settings:', error)
      toast({
        title: "Error",
        description: "Error fetching current settings",
        variant: "destructive",
      })
    }
  }

  const handleApplyNewPath = async () => {
    if (!newFolderPath) return

    try {
      const response = await fetch('http://localhost:3001/update-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folderPath: newFolderPath }),
      })
      const data = await response.json()
      if (data.success) {
        setFolderPath(newFolderPath)
        setNewFolderPath('')
        toast({
          title: "Success",
          description: "Folder path updated successfully!",
          variant: "default",
        })
      } else {
        throw new Error('Failed to update folder path')
      }
    } catch (error) {
      console.error('Error updating folder path:', error)
      toast({
        title: "Error",
        description: "An error occurred while updating the folder path",
        variant: "destructive",
      })
    }
  }

  const handleRememberCategoryToggle = async (checked: boolean) => {
    try {
      const response = await fetch('http://localhost:3001/update-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rememberCategory: checked }),
      })
      const data = await response.json()
      if (data.success) {
        setRememberCategory(checked)
        toast({
          title: "Success",
          description: `Remember category ${checked ? 'enabled' : 'disabled'}`,
          variant: "default",
        })
      } else {
        throw new Error('Failed to update remember category setting')
      }
    } catch (error) {
      console.error('Error updating remember category setting:', error)
      toast({
        title: "Error",
        description: "An error occurred while updating the remember category setting",
        variant: "destructive",
      })
    }
  }

  const handleRememberPageToggle = async (checked: boolean) => {
    try {
      const response = await fetch('http://localhost:3001/update-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rememberPage: checked }),
      })
      const data = await response.json()
      if (data.success) {
        setRememberPage(checked)
        toast({
          title: "Success",
          description: `Remember page ${checked ? 'enabled' : 'disabled'}`,
          variant: "default",
        })
      } else {
        throw new Error('Failed to update remember page setting')
      }
    } catch (error) {
      console.error('Error updating remember page setting:', error)
      toast({
        title: "Error",
        description: "An error occurred while updating the remember page setting",
        variant: "destructive",
      })
    }
  }

  return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            <h1 className="text-3xl font-bold mb-6 text-foreground">Settings</h1>
            <Card className="w-full max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Root Folder Configuration</CardTitle>
                <CardDescription>Set the root folder for LockerZ to manage your files and categories</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="currentPath" className="text-sm font-medium text-muted-foreground">Current folder path:</label>
                  <Input
                      id="currentPath"
                      value={folderPath}
                      readOnly
                      disabled
                      className="mt-1 bg-muted cursor-not-allowed"
                  />
                </div>
                <div>
                  <label htmlFor="newPath" className="text-sm font-medium text-muted-foreground">New folder path:</label>
                  <div className="flex mt-1">
                    <Input
                        id="newPath"
                        value={newFolderPath}
                        onChange={(e) => setNewFolderPath(e.target.value)}
                        placeholder="Select a new folder"
                        className="flex-grow"
                    />
                  </div>
                </div>
                <Button onClick={handleApplyNewPath} disabled={!newFolderPath}>Apply New Path</Button>
              </CardContent>
            </Card>
            <Card className="w-full max-w-2xl mx-auto mt-6">
              <CardHeader>
                <CardTitle>Locker Settings</CardTitle>
                <CardDescription>Configure additional settings for the Locker page</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                      id="remember-category"
                      checked={rememberCategory}
                      onCheckedChange={handleRememberCategoryToggle}
                  />
                  <Label htmlFor="remember-category">Remember selected category in Locker</Label>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
  )
}
