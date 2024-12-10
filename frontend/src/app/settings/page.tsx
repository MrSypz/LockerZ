'use client'

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { open } from '@tauri-apps/plugin-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from 'react-i18next'

export default function Settings() {
    const { t, i18n } = useTranslation()
    const [folderPath, setFolderPath] = useState('')
    const [newFolderPath, setNewFolderPath] = useState('')
    const [rememberCategory, setRememberCategory] = useState(false)

    useEffect(() => {
        fetchCurrentSettings()
    }, [])

    const fetchCurrentSettings = async () => {
        try {
            const response = await fetch('http://localhost:3001/get-settings')
            const data = await response.json()
            setFolderPath(data.folderPath)
            setRememberCategory(data.rememberCategory)
            await i18n.changeLanguage(data.lang)
        } catch (error) {
            toast({
                title: t('toast.titleType.error'),
                description: t('settings.toast.errorFetchingSettings'),
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
            toast({
                title: t('toast.titleType.error'),
                description: t('settings.toast.errorSelectingFolder'),
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
                    title: t('toast.titleType.success'),
                    description: t('settings.toast.folderPathUpdated'),
                })
            } else {
                new Error('Failed to update folder path')
            }
        } catch (error) {
            toast({
                title: t('toast.titleType.error'),
                description: t('settings.toast.errorUpdatingFolderPath'),
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
                    title: t('toast.titleType.success'),
                    description: checked ? t('settings.toast.rememberCategoryEnabled') : t('settings.toast.rememberCategoryDisabled'),
                })
            } else {
                new Error('Failed to update remember category setting')
            }
        } catch {
            toast({
                title: t('toast.titleType.error'),
                description: t('settings.toast.errorUpdatingRememberCategory'),
                variant: "destructive",
            })
        }
    }

    const handleLanguageChange = async (lang: string) => {
        try {
            const response = await fetch('http://localhost:3001/update-settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({lang}),
            })
            const data = await response.json()
            if (data.success) {
                await i18n.changeLanguage(lang)
                toast({
                    title: t('toast.titleType.success'),
                    description: t('settings.toast.languageChanged', { lang }),
                })
            } else {
                new Error('Failed to update language setting')
            }
        } catch (error) {
            toast({
                title: t('toast.titleType.error'),
                description: t('settings.toast.errorUpdatingLanguage'),
                variant: "destructive",
            })
        }
    }

    return (
        <div className="flex h-screen bg-background">
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto p-6">
                    <h1 className="text-3xl font-bold mb-6 text-foreground">{t('settings.title')}</h1>
                    <Card className="w-full max-w-2xl mx-auto">
                        <CardHeader>
                            <CardTitle>{t('settings.rootFolder.title')}</CardTitle>
                            <CardDescription>{t('settings.rootFolder.description')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label htmlFor="currentPath" className="text-sm font-medium text-muted-foreground">
                                    {t('settings.rootFolder.currentPath')}
                                </label>
                                <Input
                                    id="currentPath"
                                    value={folderPath}
                                    readOnly
                                    disabled
                                    className="mt-1 bg-muted cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label htmlFor="newPath" className="text-sm font-medium text-muted-foreground">
                                    {t('settings.rootFolder.newPath')}
                                </label>
                                <div className="flex mt-1 space-x-2">
                                    <Input
                                        id="newPath"
                                        value={newFolderPath}
                                        onChange={(e) => setNewFolderPath(e.target.value)}
                                        placeholder={t('settings.rootFolder.newPath')}
                                        className="flex-grow"
                                    />
                                    <Button onClick={handleSelectFolder}>{t('settings.rootFolder.selectFolder')}</Button>
                                </div>
                            </div>
                            <Button onClick={handleApplyNewPath} disabled={!newFolderPath}>
                                {t('settings.rootFolder.applyNewPath')}
                            </Button>
                        </CardContent>
                    </Card>
                    <Card className="w-full max-w-2xl mx-auto mt-6">
                        <CardHeader>
                            <CardTitle>{t('settings.lockerSettings.title')}</CardTitle>
                            <CardDescription>{t('settings.lockerSettings.description')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="remember-category"
                                    checked={rememberCategory}
                                    onCheckedChange={handleRememberCategoryToggle}
                                />
                                <Label htmlFor="remember-category">{t('settings.lockerSettings.rememberCategory')}</Label>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="language-select">{t('settings.lockerSettings.language')}</Label>
                                <Select value={i18n.language} onValueChange={handleLanguageChange}>
                                    <SelectTrigger id="language-select" className="w-[200px]">
                                        <SelectValue placeholder={t('settings.lockerSettings.language')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="en">English</SelectItem>
                                        <SelectItem value="th">ไทย</SelectItem>
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

