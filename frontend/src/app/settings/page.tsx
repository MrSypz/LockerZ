'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Sidebar } from "@/components/sidebar"

export default function Settings() {
  const [folderPath, setFolderPath] = useState('')
  const [newFolderPath, setNewFolderPath] = useState('')
  const [alert, setAlert] = useState({ show: false, message: '', type: '' })

  useEffect(() => {
    fetchCurrentPath()
  }, [])

  const fetchCurrentPath = async () => {
    try {
      const response = await fetch('http://localhost:3001/get-folder-path')
      const data = await response.json()
      setFolderPath(data.folderPath)
    } catch (error) {
      console.error('Error fetching current path:', error)
      setAlert({ show: true, message: 'Error fetching current path', type: 'error' })
    }
  }

  const handleApplyNewPath = async () => {
    if (!newFolderPath) return

    try {
      const response = await fetch('http://localhost:3001/update-folder-path', {
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
        setAlert({ show: true, message: 'Folder path updated successfully!', type: 'success' })
      } else {
        setAlert({ show: true, message: 'Failed to update folder path', type: 'error' })
      }
    } catch (error) {
      console.error('Error updating folder path:', error)
      setAlert({ show: true, message: 'An error occurred while updating the folder path', type: 'error' })
    }
  }

  return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4">
            <h1 className="text-3xl font-bold mb-6 gradient-text">Settings</h1>
            <Card className="w-full max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Choose a Folder</CardTitle>
                <CardDescription>Enter a new root folder path for LockerZ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="currentPath" className="text-sm font-medium text-muted-foreground">Current folder
                    path:</label>
                  <Input
                      id="currentPath"
                      value={folderPath}
                      readOnly
                      disabled
                      className="mt-1 bg-muted cursor-not-allowed"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">New folder path:</p>
                  <Input
                      value={newFolderPath}
                      onChange={(e) => setNewFolderPath(e.target.value)}
                      placeholder="Enter new folder path"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleApplyNewPath} disabled={!newFolderPath}>Apply New Path</Button>
              </CardFooter>
            </Card>
            {alert.show && (
                <Alert className="mt-4 max-w-md mx-auto" variant={alert.type === 'error' ? 'destructive' : 'default'}>
                  <AlertTitle>{alert.type === 'error' ? 'Error' : 'Success'}</AlertTitle>
                  <AlertDescription>{alert.message}</AlertDescription>
                </Alert>
            )}
          </main>
        </div>
      </div>
  )
}

