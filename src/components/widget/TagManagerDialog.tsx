"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OptimizedImage } from "@/components/widget/ImageProcessor"
import { Plus, X, Tag, AlertCircle, Search, Save } from 'lucide-react'
import { toast } from "@/hooks/use-toast"
import { File } from "@/types/file"
import { invoke } from '@tauri-apps/api/core'
import {formatBytes} from "@/components/widget/Dashboard";
import {useSharedSettings} from "@/utils/SettingsContext";
import {addImage, addTag} from "@/lib/database";

interface TagManagerDialogProps {
    file: File;
    isOpen: boolean;
    onClose: () => void;
}

export function TagManagerDialog({ file, isOpen, onClose }: TagManagerDialogProps) {
    const { t } = useTranslation();
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [imageId, setImageId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<string>("selected");
    const {settings} = useSharedSettings();

    const fetchImageTags = useCallback(async (id: number) => {
        try {
            const tags = await invoke<string[]>('get_image_tags', { imageId: id });
            setSelectedTags(tags);
        } catch (error) {
            console.error('Failed to fetch image tags:', error);
            toast({
                title: t('tags.error.fetch'),
                description: t('tags.error.fetch_desc'),
                variant: "destructive",
            });
        }
    }, [t]);

    const fetchAllTags = useCallback(async () => {
        try {
            const tags = await invoke<string[]>('get_all_tags');
            setAvailableTags(tags);
        } catch (error) {
            console.error('Failed to fetch all tags:', error);
            toast({
                title: t('tags.error.fetch_all'),
                description: t('tags.error.fetch_all_desc'),
                variant: "destructive",
            });
        }
    }, [t]);

    useEffect(() => {
        const initializeTags = async () => {
            if (!isOpen) return;

            try {
                const id = await addImage(file.filepath, file.category);
                setImageId(id);
                await fetchImageTags(id);
                await fetchAllTags();
            } catch (error) {
                console.error('Failed to initialize tags:', error);
                toast({
                    title: t('tags.error.init'),
                    description: t('tags.error.init_desc'),
                    variant: "destructive",
                });
            }
        };

        initializeTags();
    }, [isOpen, file, fetchImageTags, fetchAllTags, t]);

    const handleAddTag = async () => {
        if (!newTag.trim()) return;
        try {
            await addTag(newTag.trim())
            setSelectedTags(prev => [...prev, newTag.trim()]);
            setAvailableTags(prev => [...prev, newTag.trim()]);
            setNewTag("");
            toast({
                title: t('tags.success.add'),
                description: t('tags.success.add_desc', { tag: newTag.trim() }),
            });
        } catch (error) {
            console.error('Failed to add tag:', error);
            toast({
                title: t('tags.error.add'),
                description: t('tags.error.add_desc'),
                variant: "destructive",
            });
        }
        await fetchAllTags();
    };

    const handleRemoveTag = async (tagToRemove: string) => {
        if (!imageId) return;

        try {
            await invoke('remove_image_tag', { imageId, tagName: tagToRemove });
            setSelectedTags(prev => prev.filter(tag => tag !== tagToRemove));
            toast({
                title: t('tags.success.remove'),
                description: t('tags.success.remove_desc', { tag: tagToRemove }),
            });
        } catch (error) {
            console.error('Failed to remove tag:', error);
            toast({
                title: t('tags.error.remove'),
                description: t('tags.error.remove_desc'),
                variant: "destructive",
            });
        }
    };

    const handleSelectTag = async (tag: string) => {
        if (!imageId) return;
        try {
            await invoke('tag_image', { imageId, tagName: tag });
            setSelectedTags(prev => [...prev, tag]);
            toast({
                title: t('tags.success.add'),
                description: t('tags.success.add_desc', { tag }),
            });
        } catch (error) {
            console.error('Failed to select tag:', error);
            toast({
                title: t('tags.error.add'),
                description: t('tags.error.add_desc'),
                variant: "destructive",
            });
        }
    };

    const filteredAvailableTags = availableTags
        .filter(tag => !selectedTags.includes(tag) && tag.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[900px] h-[700px] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{t('tags.dialog.title')}</DialogTitle>
                    <DialogDescription>
                        {t('tags.dialog.description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-grow flex space-x-4 overflow-hidden">
                    <Card className="w-1/3 flex flex-col">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg truncate" title={file.name}>{file.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow p-4 flex flex-col justify-between">
                            <div className="relative aspect-square rounded-lg overflow-hidden mb-4">
                                <OptimizedImage
                                    src={file.filepath}
                                    alt={file.name}
                                    width={settings.imageWidth}
                                    height={settings.imageHeight}
                                    quality={settings.imageQuality}
                                />
                            </div>
                            <div className="space-y-2 text-xs">
                                <p className="text-muted-foreground truncate" title={file.name.split('.').pop() || ''}>
                                    {t('tags.file_info.filetype')}: {file.name.split('.').pop() || t('tags.file_info.unknown')}
                                </p>
                                <p className="text-muted-foreground truncate"
                                   title={t('tags.file_info.category') + ': ' + file.category}>
                                    {t('tags.file_info.category')}: {file.category}
                                </p>
                                <p className="text-muted-foreground">
                                    {t('tags.file_info.size')}: {formatBytes(file.size)}
                                </p>
                                <p className="text-muted-foreground">
                                    {t('tags.file_info.modified')}: {new Date(file.last_modified).toLocaleString()}
                                </p>
                                <p className="text-muted-foreground">
                                    {t('tags.file_info.createat')}: {new Date(file.created_at).toLocaleString()}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex-grow flex flex-col">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col">
                            <TabsList className="w-full">
                                <TabsTrigger value="selected" className="flex-1">{t('tags.tabs.selected')}</TabsTrigger>
                                <TabsTrigger value="available"
                                             className="flex-1">{t('tags.tabs.available')}</TabsTrigger>
                                <TabsTrigger value="new" className="flex-1">{t('tags.tabs.new')}</TabsTrigger>
                            </TabsList>
                            <TabsContent value="selected"
                                         className="flex-grow flex flex-col mt-0 border-x border-b rounded-b-lg">
                                <ScrollArea className="flex-grow p-4">
                                    <div className="flex flex-wrap gap-2">
                                        {selectedTags.map(tag => (
                                            <Badge
                                                key={tag}
                                                variant="default"
                                                className="cursor-pointer group py-1 px-2"
                                            >
                                                <span className="truncate max-w-[150px]" title={tag}>{tag}</span>
                                                <X
                                                    className="ml-1 h-3 w-3 shrink-0 group-hover:text-destructive"
                                                    onClick={() => handleRemoveTag(tag)}
                                                />
                                            </Badge>
                                        ))}
                                    </div>
                                </ScrollArea>
                                <div className="p-4 border-t bg-muted">
                                    <p className="text-sm text-muted-foreground">{t('tags.selected_count', { count: selectedTags.length })}</p>
                                </div>
                            </TabsContent>
                            <TabsContent value="available" className="flex-grow flex flex-col mt-0 border-x border-b rounded-b-lg">
                                <div className="p-4">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            className="pl-8"
                                            placeholder={t('tags.search_placeholder')}
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <ScrollArea className="flex-grow p-4">
                                    {filteredAvailableTags.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {filteredAvailableTags.map(tag => (
                                                <Badge
                                                    key={tag}
                                                    variant="secondary"
                                                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground py-1 px-2"
                                                    onClick={() => handleSelectTag(tag)}
                                                >
                                                    <span className="truncate max-w-[150px]" title={tag}>{tag}</span>
                                                    <Plus className="ml-1 h-3 w-3 shrink-0" />
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                            <AlertCircle className="h-8 w-8 mb-2" />
                                            <p className="text-sm text-center">{t('tags.no_available')}</p>
                                        </div>
                                    )}
                                </ScrollArea>
                            </TabsContent>
                            <TabsContent value="new" className="flex-grow flex flex-col mt-0 border-x border-b rounded-b-lg">
                                <div className="p-4 flex-grow">
                                    <div className="flex items-center space-x-2 mb-4">
                                        <Input
                                            value={newTag}
                                            onChange={(e) => setNewTag(e.target.value)}
                                            placeholder={t('tags.add_placeholder')}
                                            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                                        />
                                        <Button size="sm" onClick={handleAddTag}>
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{t('tags.new_description')}</p>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={onClose} className="w-full">
                        <Save className="mr-2 h-4 w-4" />
                        {t('tags.save_and_close')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

