import React, { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileContextMenu } from "@/components/widget/Context-menu";
import { Tag, Plus, X } from 'lucide-react';
import { useSharedSettings } from "@/utils/SettingsContext";
import { useBatchProcessing } from "@/components/widget/BatchProcessingProvider";
import BatchOptimizedImage from "@/components/widget/BatchOptimizedImage";
import {File} from "@/types/file"
import {TagInfo} from "@/hooks/use-database";
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
    animationType?: string;
}

const animations = {
    fadeInRotate: {
        initial: { opacity: 0, rotate: -5 }, // Slight rotation for a dynamic entrance
        animate: { opacity: 1, rotate: 0 }, // Fade in and straighten
        transition: {
            type: "spring",
            stiffness: 400, // Increased stiffness for faster response
            damping: 20, // Slightly higher damping to reduce overshoot
            delay: 0 // Delay will be added dynamically in the component
        }
    },
    hover: {
        y: -5, // Slight upward movement on hover
        rotate: 2, // Slight rotation on hover
        transition: { type: "spring", stiffness: 500, damping: 10 } // Faster and snappier
    },
    tap: {
        scale: 0.95, // Slight scale down on tap
        transition: { type: "spring", stiffness: 500, damping: 15 } // Faster and snappier
    }
};

export default function FileCard({
                                     file,
                                     onDelete,
                                     onMove,
                                     onView,
                                     onTag,
                                     onSelect,
                                     index,
                                     column,
                                     totalColumns,
                                     animationType = "fadeInRotate"
                                 }: FileCardProps) {
    const [isPressed, setIsPressed] = useState(false);
    const [showAllTags, setShowAllTags] = useState(false);
    const { t } = useTranslation();
    const { optimizedImages, imageStatus } = useBatchProcessing();
    const { settings } = useSharedSettings();

    const row = Math.floor(index / totalColumns);
    const isDarkSquare = (row + column) % 2 === 0;
    const offset = (column % 2 === 0 ? 1 : -1) * 12;

    const animation = animations[animationType];

    // Calculate staggered delay based on position
    const staggerDelay = index * 0.05;

    const tags = file.tags || [];
    const maxDisplayTags = 3;
    const displayTags = showAllTags ? tags : tags.slice(0, maxDisplayTags);
    const remainingTags = tags.length - maxDisplayTags;

    const getTagColor = (tag: TagInfo) => {
        if (tag.is_category) return "tag-colour-I";
        return "tag-colour-II";
    };

    const toggleTags = (e: { preventDefault: () => void; stopPropagation: () => void; }) => {
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
                initial={animation.initial}
                animate={{
                    ...animation.animate,
                    y: offset, // Keep the offset for the staggered effect
                    scale: isPressed ? 0.95 : 1, // Apply scale on press
                }}
                transition={{
                    ...animation.transition,
                    delay: staggerDelay
                }}
                whileHover={animations.hover} // Apply hover animation
                whileTap={animations.tap} // Apply tap animation
                className="relative"
                style={{ zIndex: 1000 - index }}
                onMouseDown={() => setIsPressed(true)}
                onMouseUp={() => setIsPressed(false)}
                onMouseLeave={() => setIsPressed(false)}
            >
                <Card
                    className={`
            overflow-hidden 
            transition-colors duration-200 ease-in-out 
            hover:ring-2 hover:ring-primary/50 
            cursor-pointer 
            ${isDarkSquare
                    ? 'file-card-I'
                    : 'file-card-II'
                    }
          `}
                    onDoubleClick={(e) => {
                        e.preventDefault();
                        setIsPressed(false);
                        onSelect();
                    }}
                >
                    <CardContent className="p-0">
                        <div className="relative aspect-[2/3] rounded-t-lg overflow-hidden">
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
                  absolute inset-0 bg-black/0
                  transition-all duration-200
                  ${isPressed ? 'bg-black/20' : ''}
                `}
                            />
                        </div>

                        <div
                            className={`p-3 space-y-1.5 ${
                                isDarkSquare
                                    ? 'file-card-I'
                                    : 'file-card-II'
                            }`}
                        >
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs opacity-80">{file.category}</p>

                            <div className="flex items-center space-x-1 mt-1">
                                <div className="flex items-center gap-1">
                                    <Tag className="w-4 h-4"/>
                                    {showAllTags && (
                                        <button
                                            onClick={toggleTags}
                                            className="p-0.5 hover:bg-muted file-card-I rounded-full"
                                            title="Collapse tags"
                                        >
                                            <X className="w-3 h-3 text-muted-foreground " />
                                        </button>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-wrap gap-1">
                                    {tags.length > 0 ? (
                                        <>
                                            {displayTags.map((tag) => (
                                                <Badge
                                                    key={tag.name}
                                                    variant="secondary"
                                                    className={`
                            text-xs px-1.5 py-0 
                            transition-colors duration-200
                            ${getTagColor(tag)}
                          `}
                                                >
                                                    {tag.name}
                                                </Badge>
                                            ))}
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
                                        <span className="text-xs italic text-gray-500">
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