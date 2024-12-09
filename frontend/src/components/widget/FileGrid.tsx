'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { Card, CardContent } from "@/components/ui/card"
import { FileContextMenu } from '@/components/widget/Context-menu'
import { File } from '@/types/file'
import { motion } from "framer-motion"
import { useTranslation } from 'react-i18next'

function useColumnCount() {
    const [columnCount, setColumnCount] = useState(5)

    useEffect(() => {
        function updateColumnCount() {
            switch (true) {
                case window.innerWidth >= 1280:
                    setColumnCount(5);
                    break;
                case window.innerWidth >= 768:
                    setColumnCount(4);
                    break;
                case window.innerWidth >= 640:
                    setColumnCount(3);
                    break;
                default:
                    setColumnCount(2);
            }
        }
        updateColumnCount() // Initial call
        window.addEventListener('resize', updateColumnCount)
        return () => window.removeEventListener('resize', updateColumnCount)
    }, [])

    return columnCount
}

interface FileGridProps {
    files: File[]
    onDeleteFileAction: (file: File) => void
    onMoveFileAction: (file: File) => void
    onSelectImageAction: (imageUrl: string) => void
    apiUrl: string
}

export function FileGrid({ files, onDeleteFileAction, onMoveFileAction, onSelectImageAction, apiUrl }: FileGridProps) {
    const totalColumns = useColumnCount()

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 p-4 bg-background/50 backdrop-blur-sm rounded-lg border border-border">
            {files.map((file, index) => (
                <FileCard
                    key={`${file.category}-${file.name}`}
                    file={file}
                    onDelete={() => onDeleteFileAction(file)}
                    onMove={() => onMoveFileAction(file)}
                    onSelect={() => onSelectImageAction(`${apiUrl}${file.url}`)}
                    apiUrl={apiUrl}
                    index={index}
                    column={index % totalColumns}
                    totalColumns={totalColumns}
                />
            ))}
        </div>
    )
}

interface FileCardProps {
    file: File
    onDelete: () => void
    onMove: () => void
    onSelect: () => void
    apiUrl: string
    index: number
    column: number
    totalColumns: number
}

function FileCard({ file, onDelete, onMove, onSelect, apiUrl, index, column, totalColumns }: FileCardProps) {
    const [isLoaded, setIsLoaded] = useState(false)
    const { t } = useTranslation();

    const row = Math.floor(index / totalColumns)
    const isDarkSquare = (row + column) % 2 === 0

    const getOffset = () => {
        const columnDirection = column % 2 === 0 ? 1 : -1;
        const offsetAmount = 12;
        return columnDirection * offsetAmount;
    };

    return (
        <FileContextMenu
            file={file}
            onDeleteAction={onDelete}
            onMoveAction={onMove}
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{
                    opacity: 1,
                    y: getOffset(),
                }}
                transition={{
                    duration: 0.5,
                    delay: index * 0.05,
                    type: "spring",
                    stiffness: 100,
                    damping: 15
                }}
                className="relative"
                style={{ zIndex: 1000 - index }}
            >
                <Card
                    className={`overflow-hidden transition-all duration-300 ease-in-out hover:ring-2 hover:ring-primary/50 cursor-pointer transform hover:scale-105 hover:z-10 ${
                        isDarkSquare
                            ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }`}
                    onClick={onSelect}
                >
                    <CardContent className="p-0">
                        <div className="relative aspect-[2/3] rounded-t-lg overflow-hidden">
                            <Image
                                src={`${apiUrl}${file.url}`}
                                priority={false}
                                quality={100}
                                alt={file.name}
                                fill
                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                className={`object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                                loading="lazy"
                                onLoad={() => setIsLoaded(true)}
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/placeholder.svg';
                                    target.onerror = null;
                                }}
                            />
                            {!isLoaded && (
                                <div className="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-sm">
                                    <svg className="w-10 h-10 text-muted-foreground animate-spin" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <motion.div
                            className={`p-3 space-y-1.5 ${
                                isDarkSquare
                                    ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs opacity-80">{file.category}</p>
                            <p className="text-xs italic truncate opacity-80">
                                {file.tags?.length ? file.tags.join(', ') : t('category.tags-empty')}
                            </p>
                            {/*For debug perpose*/}
                            {/*<p className="text-xs font-semibold">Column: {column + 1} / {totalColumns}</p>*/}
                        </motion.div>
                    </CardContent>
                </Card>
            </motion.div>
        </FileContextMenu>
    )
}

