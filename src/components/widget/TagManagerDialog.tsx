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
import { motion, AnimatePresence } from "framer-motion"
import {
    Card,
    CardContent
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OptimizedImage } from "@/components/widget/ImageProcessor"
import {Plus, X, AlertCircle, Search, Save, Clock, Sparkles} from 'lucide-react'
import { toast } from "@/hooks/use-toast"
import { File } from "@/types/file"
import { invoke } from '@tauri-apps/api/core'
import {formatBytes} from "@/components/widget/Dashboard";
import {useSharedSettings} from "@/utils/SettingsContext";
import {DatabaseService} from "@/hooks/use-database";

interface TagManagerDialogProps {
    file: File;
    isOpen: boolean;
    onClose: () => void;
}

const MotionBadge = motion(Badge);

export function TagManagerDialog({ file, isOpen, onClose }: TagManagerDialogProps) {
    const { t } = useTranslation();
    const db = new DatabaseService();
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [imageId, setImageId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<string>("selected");
    const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
    const [recentTags, setRecentTags] = useState<string[]>([]);
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
                const id = await db.addImage(file.filepath, file.category);
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
            await db.addTag(newTag.trim())
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
                            <TabsList className="w-full grid grid-cols-3 mb-4">
                                <TabsTrigger value="selected">{t('tags.tabs.selected')}</TabsTrigger>
                                <TabsTrigger value="available">{t('tags.tabs.available')}</TabsTrigger>
                                <TabsTrigger value="new">{t('tags.tabs.new')}</TabsTrigger>
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
                                            <AnimatePresence>
                                                {selectedTags.map(tag => (
                                                    <MotionBadge
                                                        key={tag}
                                                        variant="default"
                                                        className="cursor-pointer group py-1 px-2 flex items-center justify-between"
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.8 }}
                                                        transition={{ duration: 0.2 }}
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                    >
                                                        <span className="truncate" title={tag}>{tag}</span>
                                                        <X
                                                            className="h-3 w-3 shrink-0 group-hover:text-destructive transition-colors duration-200"
                                                            onClick={() => handleRemoveTag(tag)}
                                                        />
                                                    </MotionBadge>
                                                ))}
                                            </AnimatePresence>
                                        </motion.div>
                                    </ScrollArea>
                                    <div className="p-2 border-t bg-muted mt-2">
                                        <p className="text-sm text-muted-foreground">{t('tags.selected_count', { count: selectedTags.length })}</p>
                                    </div>
                                </TabsContent>
                                <TabsContent value="available" className="flex-grow flex flex-col p-2">
                                    <div className="relative mb-2">
                                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            className="pl-8"
                                            placeholder={t('tags.search_placeholder')}
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <ScrollArea className="flex-grow">
                                        <motion.div
                                            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            {filteredAvailableTags.length > 0 ? (
                                                filteredAvailableTags.map(tag => (
                                                    <MotionBadge
                                                        key={tag}
                                                        variant="secondary"
                                                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground py-1 px-2 flex items-center justify-between"
                                                        onClick={() => handleSelectTag(tag)}
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                    >
                                                        <span className="truncate" title={tag}>{tag}</span>
                                                        <Plus className="h-3 w-3 shrink-0" />
                                                    </MotionBadge>
                                                ))
                                            ) : (
                                                <motion.div
                                                    className="col-span-full flex flex-col items-center justify-center h-full text-muted-foreground"
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.3 }}
                                                >
                                                    <AlertCircle className="h-8 w-8 mb-2" />
                                                    <p className="text-sm text-center">{t('tags.no_available')}</p>
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    </ScrollArea>
                                </TabsContent>
                                <TabsContent value="new" className="flex-grow flex flex-col p-2">
                                    <motion.div
                                        className="flex items-center space-x-2 mb-4"
                                        initial={{ opacity: 0, y: -20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <Input
                                            value={newTag}
                                            onChange={(e) => setNewTag(e.target.value)}
                                            placeholder={t('tags.add_placeholder')}
                                            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                                        />
                                        <Button size="sm" onClick={handleAddTag}>
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </motion.div>
                                    <motion.div
                                        className="flex-grow flex flex-col space-y-4"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: 0.1 }}
                                    >
                                        <div>
                                            <h4 className="text-sm font-medium mb-2 flex items-center">
                                                <Clock className="h-4 w-4 mr-1" />
                                                {t('tags.recent')}
                                            </h4>
                                            <ScrollArea className="h-20">
                                                <div className="flex flex-wrap gap-2">
                                                    {recentTags.map(tag => (
                                                        <MotionBadge
                                                            key={tag}
                                                            variant="outline"
                                                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                                            onClick={() => handleSelectTag(tag)}
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                        >
                                                            {tag}
                                                        </MotionBadge>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium mb-2 flex items-center">
                                                <Sparkles className="h-4 w-4 mr-1" />
                                                {t('tags.suggested')}
                                            </h4>
                                            <ScrollArea className="h-20">
                                                <div className="flex flex-wrap gap-2">
                                                    {suggestedTags.map(tag => (
                                                        <MotionBadge
                                                            key={tag}
                                                            variant="outline"
                                                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                                            onClick={() => handleSelectTag(tag)}
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                        >
                                                            {tag}
                                                        </MotionBadge>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        </div>
                                    </motion.div>
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>
                </div>

                <DialogFooter className="p-6 pt-2">
                    <Button onClick={onClose} className="w-full">
                        <Save className="mr-2 h-4 w-4" />
                        {t('tags.save_and_close')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}