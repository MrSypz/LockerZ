import {File} from "@/types/file";
import {useTranslation} from "react-i18next";
import {useSharedSettings} from "@/utils/SettingsContext";
import {FileContextMenu} from "@/components/widget/Context-menu";
import {motion} from "framer-motion";
import {Card, CardContent} from "@/components/ui/card";
import {OptimizedImage} from "@/components/widget/ImageProcessor";
import React from "react";

interface FileCardProps {
    file: File
    onDelete: () => void
    onMove: () => void
    onView: () => void
    onSelect: () => void
    onTag: () => void
    index: number
    column: number
    totalColumns: number
}

export function FileCard({file, onDelete, onMove, onView,onTag, onSelect, index, column, totalColumns}: FileCardProps) {
    const {t} = useTranslation();
    const {settings} = useSharedSettings();
    const row = Math.floor(index / totalColumns);
    const isDarkSquare = (row + column) % 2 === 0;
    const offset = (column % 2 === 0 ? 1 : -1) * 12;

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
            >
                <Card
                    className={`overflow-hidden transition-all duration-200 ease-in-out  hover:ring-2 hover:ring-primary/50 cursor-pointer ${
                        isDarkSquare
                            ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }`}
                    onClick={onSelect}
                >
                    <CardContent className="p-0">
                        <div className="relative aspect-[2/3] rounded-t-lg overflow-hidden">
                            <OptimizedImage
                                src={file.filepath}
                                alt={file.name}
                                width={settings.imageWidth}
                                height={settings.imageHeight}
                                quality={settings.imageQuality}
                            />
                        </div>
                        <div
                            className={`p-3 space-y-1.5 ${
                                isDarkSquare
                                    ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }`}
                        >
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs opacity-80">{file.category}</p>
                            <p className="text-xs italic truncate opacity-80">
                                {file.tags?.length ? file.tags.join(', ') : t('category.tags-empty')}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </FileContextMenu>
    );
}
