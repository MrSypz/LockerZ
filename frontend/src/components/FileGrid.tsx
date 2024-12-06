import React from 'react'
import Image from 'next/image'
import { Card, CardContent } from "@/components/ui/card"
import { FileContextMenu } from '@/components/context-menu'
import { File } from '@/types/file'

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
            {files.map((file) => (
                <FileContextMenu
                    key={`${file.category}-${file.name}`}
                    file={file}
                    onDelete={() => onDeleteFile(file)}
                    onMove={() => onMoveFile(file)}
                >
                    <Card
                        className="overflow-hidden transition-all duration-300 ease-in-out hover:ring-2 hover:ring-primary/50 bg-card border-border cursor-pointer"
                        onClick={() => onSelectImage(`${apiUrl}${file.url}`)}
                    >
                        <CardContent className="p-0">
                            <div className="relative aspect-[3/4]">
                                <Image
                                    src={`${apiUrl}${file.url}`}
                                    alt={file.name}
                                    fill
                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                    className="object-cover"
                                    loading="lazy"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = '/placeholder-image.jpg';
                                        target.onerror = null;
                                    }}
                                />
                            </div>
                            <div className="p-2 space-y-1">
                                <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {new Date(file.createdAt).toLocaleDateString()}
                                </p>
                                <p className="text-xs text-muted-foreground">{file.category}</p>
                                <p className="text-xs text-muted-foreground italic truncate">
                                    {file.tags?.length ? file.tags.join(', ') : 'No tags'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </FileContextMenu>
            ))}
        </div>
    )
}

