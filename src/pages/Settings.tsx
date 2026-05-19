import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { open } from '@tauri-apps/plugin-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from 'react-i18next'
import { useSettings } from '@/hooks/useSettings'
import { Loader2, X, Plus, EyeOff } from 'lucide-react'
import { PerformanceImpact } from '@/components/ui/performance-impact'
import { languages } from "@/lib/lang"
import { Badge } from "@/components/ui/badge"

export default function SettingsPage() {
    const { t, i18n } = useTranslation()
    const { settings, updateSettings, isLoading } = useSettings()
    const [newFolderPath, setNewFolderPath] = useState('')
    const [newSensitiveTag, setNewSensitiveTag] = useState('')

    const sensitiveTags: string[] = settings?.sensitive_tags ?? ["explicit"]

    const handleAddSensitiveTag = async () => {
        const tag = newSensitiveTag.trim().toLowerCase()
        if (!tag || sensitiveTags.includes(tag)) return
        await updateSettings({ sensitive_tags: [...sensitiveTags, tag] })
        setNewSensitiveTag('')
    }

    const handleRemoveSensitiveTag = async (tag: string) => {
        await updateSettings({ sensitive_tags: sensitiveTags.filter(t => t !== tag) })
    }

    const handleSelectFolder = async () => {
        try {
            const selected = await open({ directory: true, multiple: false, defaultPath: settings?.folderPath })
            if (selected) {
                setNewFolderPath(selected as string)
                if (settings?.rememberCategory) {
                    localStorage.setItem('lastSelectedCategory', 'all')
                }
            }
        } catch (error) {
            console.error('Error selecting folder:', error)
        }
    }

    const handleApplyNewPath = async () => {
        if (!newFolderPath) return
        await updateSettings({ folderPath: newFolderPath })
        setNewFolderPath('')
    }

    const handleLanguageChange = async (lang: string) => {
        await updateSettings({ lang })
        await i18n.changeLanguage(lang)
    }

    const handleImageQualityChange = async (value: number[]) => {
        await updateSettings({ imageQuality: value[0] })
    }

    const handleImageWidthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const width = parseInt(event.target.value)
        if (!isNaN(width)) updateSettings({ imageWidth: width })
    }

    const handleImageHeightChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const height = parseInt(event.target.value)
        if (!isNaN(height)) updateSettings({ imageHeight: height })
    }

    const handleBatchProcessChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(event.target.value)
        if (!isNaN(value)) updateSettings({ batch_process: value })
    }

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="p-6">
                    <h1 className="text-3xl font-bold mb-6 gradient-text-header">{t('settings.title')}</h1>

                    <Card className="w-full max-w-2xl mx-auto">
                        <CardHeader>
                            <CardTitle>{t('settings.rootFolder.title')}</CardTitle>
                            <CardDescription>{t('settings.rootFolder.description')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                    {t('settings.rootFolder.currentPath')}
                                </label>
                                <Input value={settings?.folderPath} readOnly disabled className="mt-1 bg-muted cursor-not-allowed" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">
                                    {t('settings.rootFolder.newPath')}
                                </label>
                                <div className="flex mt-1 space-x-2">
                                    <Input
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
                            <CardTitle>{t('settings.languageSettings.title')}</CardTitle>
                            <CardDescription>{t('settings.languageSettings.description')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="language-select">{t('settings.languageSettings.language')}</Label>
                                <Select value={settings?.lang} onValueChange={handleLanguageChange}>
                                    <SelectTrigger id="language-select" className="w-[200px]">
                                        <SelectValue placeholder={t('settings.languageSettings.language')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.values(languages).map((language) => (
                                            <SelectItem key={language.code} value={language.code}>
                                                {language.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
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
                                    checked={settings?.rememberCategory}
                                    onCheckedChange={(checked) => updateSettings({ rememberCategory: checked })}
                                />
                                <Label htmlFor="remember-category">{t('settings.lockerSettings.rememberCategory')}</Label>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label>{t('settings.lockerSettings.imageQuality')}</Label>
                                    <PerformanceImpact impact="high" />
                                </div>
                                <CardDescription>{t('settings.lockerSettings.imageQuality.description')}</CardDescription>
                                <Slider min={1} max={100} step={1} value={[settings?.imageQuality || 75]} onValueChange={handleImageQualityChange} />
                                <div className="text-sm text-muted-foreground">{settings?.imageQuality}%</div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="image-width">{t('settings.lockerSettings.imageWidth')}</Label>
                                    <PerformanceImpact impact="veryhigh" />
                                </div>
                                <CardDescription>{t('settings.lockerSettings.imageWidth.description')}</CardDescription>
                                <Input id="image-width" type="number" value={settings?.imageWidth} onChange={handleImageWidthChange} min={100} />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="image-height">{t('settings.lockerSettings.imageHeight')}</Label>
                                    <PerformanceImpact impact="veryhigh" />
                                </div>
                                <CardDescription>{t('settings.lockerSettings.imageHeight.description')}</CardDescription>
                                <Input id="image-height" type="number" value={settings?.imageHeight} onChange={handleImageHeightChange} min={250} />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="batch-process">{t('settings.lockerSettings.batchprocess')}</Label>
                                    <PerformanceImpact impact="none" />
                                </div>
                                <CardDescription>{t('settings.lockerSettings.batchprocess.description')}</CardDescription>
                                <Input id="batch-process" type="number" value={settings?.batch_process} onChange={handleBatchProcessChange} min={1} max={255} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="w-full max-w-2xl mx-auto mt-6">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <EyeOff className="h-4 w-4 text-amber-400" />
                                Sensitive Content
                            </CardTitle>
                            <CardDescription>
                                Images tagged with any of these tags will be blurred in the locker. Click the eye icon in the sidebar to toggle safe mode on/off.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-2 min-h-8">
                                {sensitiveTags.length === 0 && (
                                    <span className="text-sm text-muted-foreground italic">No sensitive tags defined</span>
                                )}
                                {sensitiveTags.map(tag => (
                                    <Badge key={tag} variant="secondary" className="gap-1 pr-1 bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                        {tag}
                                        <button
                                            onClick={() => handleRemoveSensitiveTag(tag)}
                                            className="ml-1 rounded-full hover:bg-amber-500/20 p-0.5"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add tag (e.g. explicit, nsfw, 18r)"
                                    value={newSensitiveTag}
                                    onChange={e => setNewSensitiveTag(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleAddSensitiveTag() }}
                                    className="flex-1"
                                />
                                <Button onClick={handleAddSensitiveTag} disabled={!newSensitiveTag.trim()}>
                                    <Plus className="h-4 w-4 mr-1" /> Add
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
        </div>
    )
}
