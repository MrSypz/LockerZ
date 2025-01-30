import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileContextMenu } from "@/components/widget/Context-menu";
import { Tag, Plus, X } from 'lucide-react';
import { useSharedSettings } from "@/utils/SettingsContext";
import { File } from "@/types/file"
import {useBatchProcessing} from "@/components/widget/BatchProcessingProvider";
import BatchOptimizedImage from "@/components/widget/BatchOptimizedImage";
interface FileCardProps {
    file: File;
    onDelete: () => void;
    onMove: () => void;
    onView: () => void;
    onSelect: () => void;
    onTag: () => void;
    index: number;
    column: number;
    totalColumns: number;
}

export default function FileCard({
                                     file,
                                     onDelete,
                                     onMove,
                                     onView,
                                     onTag,
                                     onSelect,
                                     index,
                                     column,
                                     totalColumns
                                 }: FileCardProps) {
    const [isPressed, setIsPressed] = useState(false);
    const [showAllTags, setShowAllTags] = useState(false);
    const { t } = useTranslation();
    const { optimizedImages, imageStatus } = useBatchProcessing();
    const { settings } = useSharedSettings();


    const row = Math.floor(index / totalColumns);
    const isDarkSquare = (row + column) % 2 === 0;
    const offset = (column % 2 === 0 ? 1 : -1) * 12;

    const tags = file.tags || [];
    const maxDisplayTags = 3;
    const displayTags = showAllTags ? tags : tags.slice(0, maxDisplayTags);
    const remainingTags = tags.length - maxDisplayTags;

    const getTagColor = (tag) => {
        if (tag.is_category) return "bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700";
        return "bg-primary/10 hover:bg-primary/20 text-primary";
    };

    const toggleTags = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowAllTags(!showAllTags);
    };

    return (
        <FileContextMenu
            file={file}
            onViewAction={onView}
            onDeleteAction={onDelete}
            onMoveAction={onMove}
            onTagAction={onTag}
        >
            <motion.div
                layout="position"
                animate={{
                    y: offset,
                    scale: isPressed ? 0.98 : 1,
                }}
                transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 25,
                    mass: 1,
                }}
                whileHover={{
                    scale: 1.05,
                    zIndex: 10,
                    transition: { duration: 0.2 }
                }}
                className="relative"
                style={{ zIndex: 1000 - index }}
                onMouseDown={() => setIsPressed(true)}
                onMouseUp={() => setIsPressed(false)}
                onMouseLeave={() => setIsPressed(false)}
            >
                <Card
                    className={`
                        overflow-hidden 
                        transition-all duration-200 ease-in-out 
                        hover:ring-2 hover:ring-primary/50 
                        cursor-pointer 
                        ${isDarkSquare
                        ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }
                        ${isPressed ? 'brightness-95 shadow-inner' : 'shadow-sm'}
                    `}
                    onDoubleClick={(e) => {
                        e.preventDefault();
                        setIsPressed(false);
                        onSelect();
                    }}
                >
                    <CardContent className="p-0">
                        {/* Image Section */}
                        <div className="relative aspect-[2/3] rounded-t-lg overflow-hidden transition-all duration-200">
                            <BatchOptimizedImage
                                src={file.filepath}
                                alt={file.name}
                                width={settings.imageWidth}
                                height={settings.imageHeight}
                                quality={settings.imageQuality}
                                optimizedData={optimizedImages.get(file.filepath)}
                                status={imageStatus.get(file.filepath) || 'queued'}
                            />
                            <div
                                className={`
                                    absolute inset-0
                                    transition-all duration-200
                                    ${isPressed ? 'bg-black/20' : 'bg-black/0'}
                                `}
                            />
                        </div>

                        {/* Info Section */}
                        <div
                            className={`p-3 space-y-1.5 ${
                                isDarkSquare
                                    ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }`}
                        >
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs opacity-80">{file.category}</p>

                            {/* Tags Section */}
                            <div className="flex items-center space-x-1 mt-1">
                                <div className="flex items-center gap-1">
                                    <Tag className="w-4 h-4 text-primary"/>
                                    {showAllTags && (
                                        <button
                                            onClick={toggleTags}
                                            className="p-0.5 hover:bg-muted rounded-full"
                                            title="Collapse tags"
                                        >
                                            <X className="w-3 h-3 text-muted-foreground" />
                                        </button>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-wrap gap-1">
                                    {tags.length > 0 ? (
                                        <>
                                            <AnimatePresence mode="wait">
                                                {displayTags.map((tag) => (
                                                    <motion.div
                                                        key={tag.name}
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.8 }}
                                                        transition={{ duration: 0.15 }}
                                                    >
                                                        <Badge
                                                            variant="secondary"
                                                            className={`
                                                                text-xs px-1.5 py-0 
                                                                transition-colors duration-200
                                                                ${getTagColor(tag)}
                                                            `}
                                                        >
                                                            {tag.name}
                                                        </Badge>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                            {!showAllTags && remainingTags > 0 && (
                                                <Badge
                                                    variant="secondary"
                                                    className="text-xs px-1.5 py-0 bg-muted text-muted-foreground
                                                             cursor-pointer hover:bg-muted/80"
                                                    onClick={toggleTags}
                                                >
                                                    <Plus className="w-3 h-3 mr-0.5"/>
                                                    {remainingTags}
                                                </Badge>
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-xs italic text-muted-foreground">
                                            {t('category.tags-empty')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </FileContextMenu>
    );
}