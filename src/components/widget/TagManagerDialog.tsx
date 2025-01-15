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
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OptimizedImage } from "@/components/widget/ImageProcessor"
import {
    Plus,
    AlertCircle,
    Search,
    ImageIcon,
    Tag,
    FolderIcon,
    ScaleIcon,
    CalendarIcon,
    FileIcon
} from 'lucide-react'
import { toast } from "@/hooks/use-toast"
import { File } from "@/types/file"
import { formatBytes } from "@/components/widget/Dashboard"
import { useSharedSettings } from "@/utils/SettingsContext"
import { DatabaseService, TagInfo } from "@/hooks/use-database"
import { TagItem } from "./TagItem"
import { Separator } from "@/components/ui/separator"
import {Label} from "@radix-ui/react-menu";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";

interface TagManagerDialogProps {
    file: File;
    isOpen: boolean;
    onClose: () => void;
}

export function TagManagerDialog({ file, isOpen, onClose }: TagManagerDialogProps) {
    const { t } = useTranslation();
    const db = new DatabaseService();
    const [availableTags, setAvailableTags] = useState<TagInfo[]>([]);
    const [selectedTags, setSelectedTags] = useState<TagInfo[]>([]);
    const [selectedAvailableTags, setSelectedAvailableTags] = useState<TagInfo[]>([]);
    const [newTag, setNewTag] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [imageId, setImageId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<string>("selected");
    const { settings } = useSharedSettings();

    const fetchImageTags = useCallback(async (id: number) => {
        try {
            const tags = await db.getImageTags(id);
            setSelectedTags(tags);
        } catch (error) {
            console.error('Failed to fetch image tags:', error);
            toast({
                title: t('tags.error.fetch'),
                description: String(error),
                variant: "destructive",
            });
        }
    }, [t]);

    const fetchAllTags = useCallback(async () => {
        try {
            const tags = await db.getAllTags();
            setAvailableTags(tags);
        } catch (error) {
            toast({
                title: t('tags.error.fetch_all'),
                description: String(error),
                variant: "destructive",
            });
        }
    }, [t]);

    useEffect(() => {
        const initializeTags = async () => {
            if (!isOpen) return;
            try {
                let id = await db.addImage(file.filepath, file.category);
                setImageId(id);
                await fetchImageTags(id);
                await fetchAllTags();
            } catch (error) {
                toast({
                    title: t('tags.error.init'),
                    description: String(error),
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
            setAvailableTags(prev => [...prev, { name: newTag.trim(), is_category: false }]);
            setNewTag("");
            toast({
                title: t('tags.success.add'),
                description: t('tags.success.add_desc', { tag: newTag.trim() }),
            });
        } catch (error) {
            toast({
                title: t('tags.error.add'),
                description: String(error),
                variant: "destructive",
            });
        }
        await fetchAllTags();
    };

    const handleRemoveTag = async (tagToRemove: string) => {
        if (!imageId) return;
        try {
            await db.removeImageTag(imageId, tagToRemove);
            setSelectedTags(prev => prev.filter(tag => tag.name !== tagToRemove));
            toast({
                title: t('tags.success.remove'),
                description: t('tags.success.remove_desc', { tag: tagToRemove }),
            });
        } catch (error) {
            toast({
                title: t('tags.error.remove'),
                description: String(error),
                variant: "destructive",
            });
        }
    };

    const handleRenameTag = async (oldTag: string, newTag: string) => {
        try {
            await db.editTag(oldTag, newTag);
            setAvailableTags(prev => prev.map(tag =>
                tag.name === oldTag ? { ...tag, name: newTag } : tag
            ));
            setSelectedTags(prev => prev.map(tag =>
                tag.name === oldTag ? { ...tag, name: newTag } : tag
            ));
            toast({
                title: t('tags.success.rename'),
                description: t('tags.success.rename_desc', { oldTag, newTag }),
            });
        } catch (error) {
            toast({
                title: t('tags.error.rename'),
                description: String(error),
                variant: "destructive",
            });
        }
    };

    const handleDeleteTag = async (tagToDelete: string) => {
        try {
            await db.removeTag(tagToDelete);
            setAvailableTags(prev => prev.filter(tag => tag.name !== tagToDelete));
            setSelectedTags(prev => prev.filter(tag => tag.name !== tagToDelete));
            toast({
                title: t('tags.success.delete'),
                description: t('tags.success.delete_desc', { tag: tagToDelete }),
            });
        } catch (error) {
            toast({
                title: t('tags.error.delete'),
                description: String(error),
                variant: "destructive",
            });
        }
    };

    const handleSelectAvailableTag = (tagName: string, isSelected: boolean) => {
        const tagInfo = availableTags.find(t => t.name === tagName);
        if (!tagInfo) return;
        setSelectedAvailableTags(prev =>
            isSelected
                ? [...prev, tagInfo]
                : prev.filter(t => t.name !== tagName)
        );
    };

    const handleConfirmSelectedTags = async () => {
        if (!imageId) return;
        try {
            for (const tag of selectedAvailableTags) {
                await db.addTagImage(imageId, tag.name);
            }
            setSelectedTags(prev => [...new Set([...prev, ...selectedAvailableTags])]);
            setSelectedAvailableTags([]);
            toast({
                title: t('tags.success.add_multiple'),
                description: t('tags.success.add_multiple_desc', { count: selectedAvailableTags.length }),
            });
        } catch (error) {
            toast({
                title: t('tags.error.add_multiple'),
                description: String(error),
                variant: "destructive",
            });
        }
    };

    const filteredAvailableTags = availableTags
        .filter(tag =>
            !selectedTags.some(st => st.name === tag.name) &&
            tag.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[90vw] max-w-[1400px] h-[90vh] max-h-[1000px] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-2xl font-bold">{t('tagManager.title')}</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        {t('tagManager.description')}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-grow flex flex-col md:flex-row overflow-hidden p-6 pt-2 pb-0 gap-6">
                    <Card className="md:w-1/3 flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold">{t('tagManager.imageInfo')}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow flex flex-col justify-between">
                            <motion.div
                                className="relative aspect-square rounded-lg overflow-hidden mb-4 shadow-md"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                <OptimizedImage
                                    src={file.filepath}
                                    alt={file.name}
                                    width={settings.imageWidth}
                                    height={settings.imageheigh}
                                    quality={settings.imagequality}
                                />
                            </motion.div>
                            <motion.div
                                className="space-y-2 text-sm"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.1 }}
                            >
                                <InfoItem icon={ImageIcon} label="tagManager.fileInfo.name" value={file.name} />
                                <InfoItem
                                    icon={FileIcon}
                                    label="tagManager.fileInfo.filetype"
                                    value={file.name.split('.').pop() || t('tagManager.fileInfo.unknown')}
                                />
                                <InfoItem
                                    icon={FolderIcon}
                                    label="tagManager.fileInfo.category"
                                    value={file.category}
                                />
                                <InfoItem
                                    icon={ScaleIcon}
                                    label="tagManager.fileInfo.size"
                                    value={formatBytes(file.size)}
                                />
                                <InfoItem
                                    icon={CalendarIcon}
                                    label="tagManager.fileInfo.modified"
                                    value={new Date(file.last_modified).toLocaleString()}
                                />
                                <InfoItem
                                    icon={CalendarIcon}
                                    label="tagManager.fileInfo.createat"
                                    value={new Date(file.created_at).toLocaleString()}
                                />
                            </motion.div>
                        </CardContent>
                    </Card>

                    <Separator orientation="vertical" className="hidden md:block" />

                    <div className="flex-grow flex flex-col">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col">
                            <TabsList className="w-full grid grid-cols-3 mb-4">
                                <TabsTrigger value="selected" className="py-2 px-4 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    {t('tagManager.selectedTab')}
                                </TabsTrigger>
                                <TabsTrigger value="available" className="py-2 px-4 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    {t('tagManager.availableTab')}
                                </TabsTrigger>
                                <TabsTrigger value="create" className="py-2 px-4 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    {t('tagManager.createTab')}
                                </TabsTrigger>
                            </TabsList>
                            <Card className="flex-grow flex flex-col overflow-hidden">
                                <TabsContent value="selected" className="flex-grow flex flex-col p-4">
                                    <ScrollArea className="flex-grow">
                                        <motion.div
                                            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <AnimatePresence initial={false}>
                                                {selectedTags.map(tag => (
                                                    <TagItem
                                                        key={tag.name}
                                                        tag={tag}
                                                        onRemove={handleRemoveTag}
                                                        onRename={handleRenameTag}
                                                        onDelete={handleDeleteTag}
                                                        isSelected={true}
                                                    />
                                                ))}
                                            </AnimatePresence>
                                        </motion.div>
                                    </ScrollArea>
                                    <div className="p-2 bg-muted rounded-md mt-4">
                                        <p className="text-sm font-medium">{t('tagManager.selectedCount', { count: selectedTags.length })}</p>
                                    </div>
                                </TabsContent>
                                <TabsContent value="available" className="flex-grow flex flex-col p-4">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-semibold mb-2">{t('tagManager.searchTitle')}</h3>
                                        <div className="relative">
                                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                className="pl-8"
                                                placeholder={t('tagManager.searchPlaceholder')}
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                    </div>
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
                                                        <TagItem
                                                            key={tag.name}
                                                            tag={tag}
                                                            onRemove={() => {}}
                                                            onRename={handleRenameTag}
                                                            onDelete={handleDeleteTag}
                                                            isSelected={selectedAvailableTags.includes(tag)}
                                                            onSelect={handleSelectAvailableTag}
                                                            selectable={true}
                                                            imageheigh={settings.imageheigh}
                                                            imagewidth={settings.imageWidth}
                                                            imagequality={settings.imagequality}
                                                        />
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
                                                    <div className="text-sm text-center">{t('tagManager.noAvailable')}</div>
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    </ScrollArea>
                                    {selectedAvailableTags.length > 0 && (
                                        <div className="mt-4">
                                            <Button onClick={handleConfirmSelectedTags} className="w-full">
                                                {t('tagManager.addSelected', { count: selectedAvailableTags.length })}
                                            </Button>
                                        </div>
                                    )}
                                </TabsContent>
                                <TabsContent value="create" className="flex-grow flex flex-col p-4">
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold">{t('tagManager.createTitle')}</h3>
                                        <form onSubmit={(e) => { e.preventDefault(); handleAddTag(); }} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="newTag">{t('tagManager.newTagLabel')}</Label>
                                                <Input
                                                    id="newTag"
                                                    value={newTag}
                                                    onChange={(e) => setNewTag(e.target.value)}
                                                    placeholder={t('tagManager.addPlaceholder')}
                                                />
                                            </div>
                                            <Button type="submit" className="w-full">
                                                <Plus className="h-4 w-4 mr-2" />
                                                {t('tagManager.addButton')}
                                            </Button>
                                        </form>
                                        <Separator />
                                        <div className="space-y-2">
                                            <h4 className="font-medium">{t('tagManager.recentlyCreated')}</h4>
                                            <ScrollArea className="h-[200px]">
                                                <div className="space-y-2">
                                                    {availableTags.slice(-5).reverse().map(tag => (
                                                        <div key={tag.name} className="flex items-center justify-between">
                                                            <span className="flex items-center">
                                                                <Tag className="h-4 w-4 mr-2" />
                                                                {tag.name}
                                                            </span>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleSelectAvailableTag(tag.name, true)}
                                                            >
                                                                {t('tagManager.addToImage')}
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Card>
                        </Tabs>
                    </div>
                </div>

                <DialogFooter className="p-6 pt-2">
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface InfoItemProps {
    icon: React.ElementType;
    label: string;
    value: string;
}

function InfoItem({ icon: Icon, label, value }: InfoItemProps) {
    const { t } = useTranslation();
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted transition-colors">
                        <Icon className="h-5 w-5 text-primary" />
                        <span className="font-medium text-sm">{t(label)}:</span>
                        <span className="text-sm text-muted-foreground truncate flex-1">{value}</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{value}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
