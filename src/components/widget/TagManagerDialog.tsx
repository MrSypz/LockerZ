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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { motion, AnimatePresence } from "framer-motion"
import {
    Card,
    CardContent
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OptimizedImage } from "@/components/widget/ImageProcessor"
import { Plus, AlertCircle, Search, Save } from 'lucide-react'
import { toast } from "@/hooks/use-toast"
import { File } from "@/types/file"
import { invoke } from '@tauri-apps/api/core'
import { formatBytes } from "@/components/widget/Dashboard"
import { useSharedSettings } from "@/utils/SettingsContext"
import { DatabaseService } from "@/hooks/use-database"
import { Separator } from "@/components/ui/separator"
import { TagItem } from "./TagItem"

interface TagManagerDialogProps {
    file: File;
    isOpen: boolean;
    onCloseAction: () => void;
}

export function TagManagerDialog({ file, isOpen, onCloseAction  }: TagManagerDialogProps) {
    const { t } = useTranslation();
    const db = new DatabaseService();
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [imageId, setImageId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<string>("selected");
    const { settings } = useSharedSettings();
    const [selectedAvailableTags, setSelectedAvailableTags] = useState<string[]>([]);

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
            const tags = await db.getAllTags();
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
                let imageId = await db.getImageId(file.filepath, file.category);

                if (!imageId) {
                    imageId = await db.addImage(file.filepath, file.category);
                    console.log("New image added with id:", imageId);
                } else {
                    console.log("Existing image found with id:", imageId);
                }
                setImageId(imageId);
                await fetchImageTags(imageId);
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
            await db.addTag(newTag.trim())
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

    const handleRenameTag = async (oldTag: string, newTag: string) => {
        try {
            await db.renameTag(oldTag, newTag);
            setAvailableTags(prev => prev.map(tag => tag === oldTag ? newTag : tag));
            setSelectedTags(prev => prev.map(tag => tag === oldTag ? newTag : tag));
            toast({
                title: t('tags.success.rename'),
                description: t('tags.success.rename_desc', { oldTag, newTag }),
            });
        } catch (error) {
            console.error('Failed to rename tag:', error);
            toast({
                title: t('tags.error.rename'),
                description: t('tags.error.rename_desc'),
                variant: "destructive",
            });
        }
    };

    const handleDeleteTag = async (tagToDelete: string) => {
        try {
            await db.deleteTag(tagToDelete);
            setAvailableTags(prev => prev.filter(tag => tag !== tagToDelete));
            setSelectedTags(prev => prev.filter(tag => tag !== tagToDelete));
            toast({
                title: t('tags.success.delete'),
                description: t('tags.success.delete_desc', { tag: tagToDelete }),
            });
        } catch (error) {
            console.error('Failed to delete tag:', error);
            toast({
                title: t('tags.error.delete'),
                description: t('tags.error.delete_desc'),
                variant: "destructive",
            });
        }
    };

    const handleSelectAvailableTag = (tag: string, isSelected: boolean) => {
        setSelectedAvailableTags(prev =>
            isSelected ? [...prev, tag] : prev.filter(t => t !== tag)
        );
    };

    const handleAddSelectedTags = async () => {
        if (!imageId) return;

        try {
            for (const tag of selectedAvailableTags) {
                await db.tagImage(imageId, tag);
            }
            setSelectedTags(prev => [...new Set([...prev, ...selectedAvailableTags])]);
            setSelectedAvailableTags([]);
            toast({
                title: t('tags.success.add_multiple'),
                description: t('tags.success.add_multiple_desc', { count: selectedAvailableTags.length }),
            });
        } catch (error) {
            console.error('Failed to add selected tags:', error);
            toast({
                title: t('tags.error.add_multiple'),
                description: t('tags.error.add_multiple_desc'),
                variant: "destructive",
            });
        }
    };

    const filteredAvailableTags = availableTags
        .filter(tag => !selectedTags.includes(tag) && tag.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <Dialog open={isOpen} onOpenChange={() => {
            setAvailableTags([]);
            setSelectedTags([]);
            setNewTag("");
            setSearchTerm("");
            setImageId(null);
            setActiveTab("selected");
            setSelectedAvailableTags([]);
            onCloseAction();
        }}>
            <DialogContent className="sm:max-w-[90vw] md:max-w-[900px] h-[90vh] max-h-[700px] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>{t('tags.dialog.title')}</DialogTitle>
                    <DialogDescription>
                        {t('tags.dialog.description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-grow flex flex-col md:flex-row overflow-hidden p-6 pt-2 pb-0">
                    <Card className="md:w-1/3 mb-4 md:mb-0 md:mr-4 flex flex-col">
                        <CardContent className="flex-grow p-4 flex flex-col justify-between">
                            <motion.div
                                className="relative aspect-square rounded-lg overflow-hidden mb-4"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                <OptimizedImage
                                    src={file.filepath}
                                    alt={file.name}
                                    width={settings.imageWidth}
                                    height={settings.imageHeight}
                                    quality={settings.imageQuality}
                                />
                            </motion.div>
                            <motion.div
                                className="space-y-2 text-xs"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.1 }}
                            >
                                <p className="text-muted-foreground truncate font-medium" title={file.name}>
                                    {file.name}
                                </p>
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
                            </motion.div>
                        </CardContent>
                    </Card>

                    <div className="flex-grow flex flex-col">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col">
                            <TabsList className="w-full grid grid-cols-2 mb-4">
                                <TabsTrigger value="selected">{t('tags.tabs.selected')}</TabsTrigger>
                                <TabsTrigger value="available">{t('tags.tabs.available')}</TabsTrigger>
                            </TabsList>
                            <div className="flex-grow flex flex-col overflow-hidden border rounded-lg">
                                <TabsContent value="selected" className="flex-grow flex flex-col p-2">
                                    <ScrollArea className="flex-grow">
                                        <motion.div
                                            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <AnimatePresence initial={false}>
                                                {selectedTags.map(tag => (
                                                    <motion.div key={tag} layout>
                                                        <TagItem
                                                            tag={tag}
                                                            onRemove={handleRemoveTag}
                                                            onRename={handleRenameTag}
                                                            onDelete={handleDeleteTag}
                                                            isSelected={true}
                                                        />
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </motion.div>
                                    </ScrollArea>
                                    <div className="p-2 border-t bg-muted mt-2">
                                        <p className="text-sm text-muted-foreground">{t('tags.selected_count', { count: selectedTags.length })}</p>
                                    </div>
                                </TabsContent>
                                <TabsContent value="available" className="flex-grow flex flex-col p-2">
                                    <div className="flex items-center space-x-2 mb-4">
                                        <Input
                                            value={newTag}
                                            onChange={(e) => setNewTag(e.target.value)}
                                            placeholder={t('tags.add_placeholder')}
                                            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                                        />
                                        <Button size="sm" onClick={handleAddTag}>
                                            <Plus className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                    <div className="relative mb-2">
                                        <Search
                                            className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                                        <Input
                                            className="pl-8"
                                            placeholder={t('tags.search_placeholder')}
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <Separator className="my-4" />
                                    <ScrollArea className="flex-grow">
                                        <motion.div
                                            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2"
                                            initial={{opacity: 0}}
                                            animate={{opacity: 1}}
                                            transition={{duration: 0.3}}
                                        >
                                            {filteredAvailableTags.length > 0 ? (
                                                <AnimatePresence initial={false}>
                                                    {filteredAvailableTags.map(tag => (
                                                        <motion.div key={tag} layout>
                                                            <TagItem
                                                                tag={tag}
                                                                onRemove={() => {}}
                                                                onRename={handleRenameTag}
                                                                onDelete={handleDeleteTag}
                                                                isSelected={selectedAvailableTags.includes(tag)}
                                                                onSelect={handleSelectAvailableTag}
                                                                selectable={true}
                                                            />
                                                        </motion.div>
                                                    ))}
                                                </AnimatePresence>
                                            ) : (
                                                <motion.div
                                                    className="col-span-full flex flex-col items-center justify-center h-full text-muted-foreground"
                                                    initial={{opacity: 0, y: 20}}
                                                    animate={{opacity: 1, y: 0}}
                                                    transition={{duration: 0.3}}
                                                >
                                                    <AlertCircle className="h-8 w-8 mb-2"/>
                                                    <p className="text-sm text-center">{t('tags.no_available')}</p>
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    </ScrollArea>
                                    {selectedAvailableTags.length > 0 && (
                                        <div className="mt-4">
                                            <Button onClick={handleAddSelectedTags} className="w-full">
                                                {t('tags.add_selected', { count: selectedAvailableTags.length })}
                                            </Button>
                                        </div>
                                    )}
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>
                </div>

                <DialogFooter className="p-6 pt-2">
                    <Button onClick={() => {
                        setAvailableTags([]);
                        setSelectedTags([]);
                        setNewTag("");
                        setSearchTerm("");
                        setImageId(null);
                        setActiveTab("selected");
                        setSelectedAvailableTags([]);
                        onCloseAction();
                    }} className="w-full">
                        <Save className="mr-2 h-4 w-4"/>
                        {t('tags.save_and_close')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

