'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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
    <div className="container mx-auto p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Choose a Folder</CardTitle>
          <CardDescription>Enter a new root folder path for LockerZ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium">Current folder path:</p>
            <Input value={folderPath} readOnly />
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
        <Alert className="mt-4" variant={alert.type === 'error' ? 'destructive' : 'default'}>
          <AlertTitle>{alert.type === 'error' ? 'Error' : 'Success'}</AlertTitle>
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      )}
      <div className="mt-4 text-center">
        <Link href="/" className="text-blue-500 hover:underline">
          Back to Home
        </Link>
      </div>
    </div>
  )
}

