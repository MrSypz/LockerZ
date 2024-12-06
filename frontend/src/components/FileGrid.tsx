import React, { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent } from "@/components/ui/card"
import { FileContextMenu } from '@/components/context-menu'
import { File } from '@/types/file'
import { motion } from "framer-motion"

interface FileGridProps {
    files: File[]
    onDeleteFile: (file: File) => void
    onMoveFile: (file: File) => void
    onSelectImage: (imageUrl: string) => void
    apiUrl: string
}

export function FileGrid({ files, onDeleteFile, onMoveFile, onSelectImage, apiUrl }: FileGridProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 bg-background/50 backdrop-blur-sm rounded-lg border border-border">
            {files.map((file, index) => (
                <FileCard
                    key={`${file.category}-${file.name}`}
                    file={file}
                    onDelete={() => onDeleteFile(file)}
                    onMove={() => onMoveFile(file)}
                    onSelect={() => onSelectImage(`${apiUrl}${file.url}`)}
                    apiUrl={apiUrl}
                    index={index}
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
}

function FileCard({ file, onDelete, onMove, onSelect, apiUrl, index }: FileCardProps) {
    const [isLoaded, setIsLoaded] = useState(false)

    return (
        <FileContextMenu
            file={file}
            onDelete={onDelete}
            onMove={onMove}
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
            >
                <Card
                    className="overflow-hidden transition-all duration-300 ease-in-out hover:ring-2 hover:ring-primary/50 bg-card border-border cursor-pointer transform hover:scale-105"
                    onClick={onSelect}
                >
                    <CardContent className="p-0">
                        <div className="relative aspect-[3/4]">
                            <Image
                                src={`${apiUrl}${file.url}`}
                                alt={file.name}
                                fill
                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                className={`object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                                loading="lazy"
                                onLoad={() => setIsLoaded(true)}
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/placeholder-image.jpg';
                                    target.onerror = null;
                                }}
                            />
                            {!isLoaded && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-200 animate-pulse">
                                    <svg className="w-10 h-10 text-gray-400 animate-spin" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <motion.div
                            className="p-2 space-y-1"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {new Date(file.createdAt).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted-foreground">{file.category}</p>
                            <p className="text-xs text-muted-foreground italic truncate">
                                {file.tags?.length ? file.tags.join(', ') : 'No tags'}
                            </p>
                        </motion.div>
                    </CardContent>
                </Card>
            </motion.div>
        </FileContextMenu>
    )
}

