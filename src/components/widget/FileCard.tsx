import {useTranslation} from "react-i18next";
import {useSharedSettings} from "@/utils/SettingsContext";
import {FileContextMenu} from "@/components/widget/Context-menu";
import {motion} from "framer-motion";
import {Card, CardContent} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {OptimizedImage} from "@/components/widget/ImageProcessor";
import {File} from "@/types/file";
import { Plus, Tag } from 'lucide-react';
import {useState} from "react";

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

export function FileCard({
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
    const {t} = useTranslation();
    const {settings} = useSharedSettings();
    const row = Math.floor(index / totalColumns);
    const isDarkSquare = (row + column) % 2 === 0;
    const offset = (column % 2 === 0 ? 1 : -1) * 12;

    const maxDisplayTags = 3;
    const displayTags = file.tags?.slice(0, maxDisplayTags) || [];
    const remainingTags = (file.tags?.length || 0) - maxDisplayTags;

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
                    transition: {duration: 0.2}
                }}
                className="relative"
                style={{zIndex: 1000 - index}}
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
                        <div className="relative aspect-[2/3] rounded-t-lg overflow-hidden transition-all duration-200">
                            <OptimizedImage
                                src={file.filepath}
                                alt={file.name}
                                width={settings.imageWidth}
                                height={settings.imageHeight}
                                quality={settings.imageQuality}
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
                                    ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }`}
                        >
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs opacity-80">{file.category}</p>
                            <div className="flex items-center space-x-1 mt-1">
                                <Tag className="w-4 h-4 text-primary"/>
                                <div className="flex-1 flex flex-wrap gap-1">
                                    {displayTags.length > 0 ? (
                                        <>
                                            {displayTags.map((tag, index) => (
                                                <Badge
                                                    key={index}
                                                    variant="secondary"
                                                    className={`text-xs px-1.5 py-0 transition-colors ${
                                                        tag.is_category
                                                            ? "bg-blue-500 text-white dark:bg-blue-600 hover:bg-blue-500 dark:hover:bg-blue-600"
                                                            : "bg-primary/10 text-primary hover:bg-primary/10"
                                                    }`}
                                                >
                                                    {tag.name}
                                                </Badge>
                                            ))}
                                            {remainingTags > 0 && (
                                                <Badge
                                                    variant="secondary"
                                                    className="text-xs px-1.5 py-0 bg-muted text-muted-foreground cursor-help hover:bg-muted hover:text-muted-foreground"
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

