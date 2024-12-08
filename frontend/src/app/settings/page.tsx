'use client'

import React, {useState, useEffect} from 'react'
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Sidebar} from "@/components/sidebar"
import {toast} from "@/hooks/use-toast"
import {Switch} from "@/components/ui/switch"
import {Label} from "@/components/ui/label"
import {open} from '@tauri-apps/plugin-dialog'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"

export default function Settings() {
    const [folderPath, setFolderPath] = useState('')
    const [newFolderPath, setNewFolderPath] = useState('')
    const [rememberCategory, setRememberCategory] = useState(false)
    const [language, setLanguage] = useState('en');

    useEffect(() => {
        fetchCurrentSettings()
    }, [])

    const fetchCurrentSettings = async () => {
        try {
            const response = await fetch('http://localhost:3001/get-settings')
            const data = await response.json()
            setFolderPath(data.folderPath)
            setRememberCategory(data.rememberCategory)
            setLanguage(data.language || 'en'); // Set default language if not found
        } catch (error) {
            console.error('Error fetching current settings:', error)
            toast({
                title: "Error",
                description: "Error fetching current settings",
                variant: "destructive",
            })
        }
    }

    const handleSelectFolder = async () => {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
                defaultPath: folderPath,
            })
            if (selected) {
                setNewFolderPath(selected as string)
            }
        } catch (error) {
            console.error('Error selecting folder:', error)
            toast({
                title: "Error",
                description: "An error occurred while selecting the folder",
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
                body: JSON.stringify({folderPath: newFolderPath}),
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
                body: JSON.stringify({rememberCategory: checked}),
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

    const handleLanguageChange = async (key: string) => {
        try {
            const response = await fetch('http://localhost:3001/update-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({lang: key}),
            })
            const data = await response.json()
            if (data.success) {
                setLanguage(key);
                toast({
                    title: "Success",
                    description: `Change The language to ${key}`,
                    variant: "default",
                })
            } else {
                throw new Error('Failed to update remember category setting')
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "An error occurred while updating the language setting",
                variant: "destructive",
            })
        }
    };

    return (
        <div className="flex h-screen bg-background">
            <Sidebar/>
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto p-6">
                    <h1 className="text-3xl font-bold mb-6 text-foreground">Settings</h1>
                    <Card className="w-full max-w-2xl mx-auto">
                        <CardHeader>
                            <CardTitle>Root Folder Configuration</CardTitle>
                            <CardDescription>Set the root folder for LockerZ to manage your files and
                                categories</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label htmlFor="currentPath" className="text-sm font-medium text-muted-foreground">Current
                                    folder path:</label>
                                <Input
                                    id="currentPath"
                                    value={folderPath}
                                    readOnly
                                    disabled
                                    className="mt-1 bg-muted cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label htmlFor="newPath" className="text-sm font-medium text-muted-foreground">New
                                    folder path:</label>
                                <div className="flex mt-1 space-x-2">
                                    <Input
                                        id="newPath"
                                        value={newFolderPath}
                                        onChange={(e) => setNewFolderPath(e.target.value)}
                                        placeholder="Select a new folder"
                                        className="flex-grow"
                                    />
                                    <Button onClick={handleSelectFolder}>Select Folder</Button>
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
                            <div className="space-y-2">
                                <Label htmlFor="language-select">Language</Label>
                                <Select value={language} onValueChange={handleLanguageChange}>
                                    <SelectTrigger id="language-select" className="w-[200px]">
                                        <SelectValue placeholder="Select Language"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="en">English (EN)</SelectItem>
                                        <SelectItem value="th">ไทย (TH)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </main>
            </div>
        </div>
    )
}

