
import type React from "react"
import { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileContextMenu } from "@/components/widget/Context-menu"
import { Tag, Plus, X, Check, EyeOff, Eye } from "lucide-react"
import { useSharedSettings } from "@/utils/SettingsContext"
import { useSafeMode } from "@/utils/SafeModeContext"
import { useBatchProcessing } from "@/components/widget/BatchProcessingProvider"
import BatchOptimizedImage from "@/components/widget/BatchOptimizedImage"
import type { File } from "@/types/file"
import type { TagInfo } from "@/hooks/use-database"
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
    animationType?: string
    isSelected?: boolean
    onToggleSelect: () => void
}

// Simplify the selectionStyles object to remove redundancy
const selectionStyles = {
    container: "absolute inset-0 flex items-center justify-center z-10 overflow-hidden",
    icon: ({ isSelected }: { isSelected: boolean }) => {
        return (
            <AnimatePresence>
                {isSelected && (
                    <>
                        <motion.div
                            className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        />

                        <motion.div
                            className="absolute top-1/2 left-0 w-full h-14 bg-primary/90 flex items-center justify-center shadow-lg transform -translate-y-1/2"
                            initial={{ scaleX: 0, opacity: 0 }}
                            animate={{ scaleX: 1, opacity: 1 }}
                            exit={{ scaleX: 0, opacity: 0 }}
                            transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 25,
                                opacity: { duration: 0.2 },
                            }}
                        >
                            <motion.div
                                className="flex items-center gap-2"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ delay: 0.15, duration: 0.2 }}
                            >
                                <Check className="h-6 w-6 text-green-400" strokeWidth={3} />
                                <span className="font-bold text-lg text-gray-900 tracking-wider">SELECTED</span>
                            </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        )
    },
}

// Simplify animations object
const animations = {
    fadeInRotate: {
        initial: { opacity: 0, rotate: -5 },
        animate: { opacity: 1, rotate: 0 },
        transition: {
            type: "spring",
            stiffness: 400,
            damping: 20,
            delay: 0,
        },
    },
    hover: {
        y: -5,
        rotate: 2,
        transition: { type: "spring", stiffness: 500, damping: 10 },
    },
    tap: {
        scale: 0.95,
        transition: { type: "spring", stiffness: 500, damping: 15 },
    },
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
                                     totalColumns,
                                     animationType = "fadeInRotate",
                                     isSelected = false,
                                     onToggleSelect,
                                 }: FileCardProps) {
    const [isPressed, setIsPressed] = useState(false)
    const [showAllTags, setShowAllTags] = useState(false)
    const [revealed, setRevealed] = useState(false)
    const { t } = useTranslation()
    const { optimizedImages, imageStatus } = useBatchProcessing()
    const { settings } = useSharedSettings()
    const { isSafeMode } = useSafeMode()

    const sensitiveTagNames: string[] = settings?.sensitive_tags ?? ["explicit"]
    const isSensitive =
        sensitiveTagNames.includes(file.category) ||
        (file.tags ?? []).some(tag => sensitiveTagNames.includes(tag.name))
    const isBlurred = isSensitive && isSafeMode && !revealed

    // Re-blur when global safe mode is switched back on
    useEffect(() => { if (isSafeMode) setRevealed(false) }, [isSafeMode])

    const handleReveal = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setRevealed(true)
    }, [])

    const selectedStyle = selectionStyles

    const row = Math.floor(index / totalColumns)
    const isDarkSquare = (row + column) % 2 === 0
    const offset = (column % 2 === 0 ? 1 : -1) * 12

    const animation = animations[animationType]

    const staggerDelay = index * 0.05

    const tags = file.tags || []
    const maxDisplayTags = 3
    const displayTags = showAllTags ? tags : tags.slice(0, maxDisplayTags)
    const remainingTags = tags.length - maxDisplayTags

    const getTagColor = (tag: TagInfo) => {
        if (tag.is_category) return "tag-colour-I"
        return "tag-colour-II"
    }

    // Simplify the toggleTags function
    const toggleTags = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setShowAllTags(!showAllTags)
    }

    // Simplify the handleClick function
    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault()
        onToggleSelect()
    }

    return (
        <FileContextMenu
            file={file}
            onViewAction={onView}
            onDeleteAction={onDelete}
            onMoveAction={onMove}
            onTagAction={onTag}
            isSelected={isSelected}
        >
            <motion.div
                initial={animation.initial}
                animate={{
                    ...animation.animate,
                    y: offset,
                    scale: isPressed ? 0.95 : 1,
                    rotate: isSelected ? 2 : 0,
                }}
                transition={{
                    ...animation.transition,
                    delay: staggerDelay,
                }}
                whileHover={isSelected ? { y: -5 } : animations.hover}
                whileTap={animations.tap}
                className="relative"
                style={{ zIndex: 1000 - index }}
                onMouseDown={() => setIsPressed(true)}
                onMouseUp={() => setIsPressed(false)}
                onMouseLeave={() => setIsPressed(false)}
                onClick={handleClick}
            >
                <Card
                    className={`
            overflow-hidden 
            transition-all duration-200 ease-in-out 
            hover:ring-2 hover:ring-primary/50 
            cursor-pointer 
            ${isSelected ? "ring-2 ring-primary shadow-xl transform scale-[1.02]" : ""}
            ${isDarkSquare ? "file-card-I" : "file-card-II"}
          `}
                    onDoubleClick={(e) => {
                        e.preventDefault()
                        setIsPressed(false)
                        onSelect()
                    }}
                >
                    <CardContent className="p-0">
                        <div className="relative aspect-[2/3] rounded-t-lg overflow-hidden">
                            {selectedStyle.backgroundEffect && isSelected && <div className={selectedStyle.backgroundEffect}></div>}

                            <div className={selectedStyle.container}>
                                {selectedStyle === selectionStyles
                                    ? selectedStyle.icon({ isSelected })
                                    : isSelected && (
                                    <motion.div className={selectedStyle.indicator} {...selectedStyle.animation}>
                                        {selectedStyle.icon({})}
                                    </motion.div>
                                )}
                            </div>

                            <BatchOptimizedImage
                                src={file.filepath}
                                alt={file.name}
                                width={settings.imageWidth}
                                height={settings.imageHeight}
                                quality={settings.imageQuality}
                                optimizedData={optimizedImages.get(file.filepath)}
                                status={imageStatus.get(file.filepath) || "queued"}
                            />

                            {isBlurred && (
                                <div
                                    className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 cursor-pointer"
                                    style={{ backdropFilter: "blur(18px)", background: "rgba(0,0,0,0.45)" }}
                                    onClick={handleReveal}
                                >
                                    <EyeOff className="h-8 w-8 text-white/80" />
                                    <span className="text-[10px] font-semibold text-white/70 uppercase tracking-widest">Sensitive</span>
                                    <span className="text-[9px] text-white/50 flex items-center gap-1">
                                        <Eye className="h-3 w-3" /> Click to reveal
                                    </span>
                                </div>
                            )}

                            <div
                                className={`
                  absolute inset-0
                  transition-all duration-300
                  ${isPressed ? "bg-black/20" : ""}
                  ${isSelected && selectedStyle !== selectionStyles ? "ring-2 ring-primary ring-inset" : ""}
                `}
                            />
                        </div>

                        <div
                            className={`p-3 space-y-1.5 ${
                                isDarkSquare ? "file-card-I" : "file-card-II"
                            } ${isSelected ? "bg-primary/5" : ""}`}
                        >
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs opacity-80">{file.category}</p>

                            <div className="flex items-center space-x-1 mt-1">
                                <div className="flex items-center gap-1">
                                    <Tag className="w-4 h-4" />
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
                                                    <Plus className="w-3 h-3 mr-0.5" />
                                                    {remainingTags}
                                                </Badge>
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-xs italic text-gray-500">{t("category.tags-empty")}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </FileContextMenu>
    )
}

