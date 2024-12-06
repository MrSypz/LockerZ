"use client"

import * as React from "react"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Trash2, FolderInput, ExternalLink } from 'lucide-react'

interface FileContextMenuProps {
    children: React.ReactNode
    file: {
        name: string
        category: string
        url: string
    }
    onDelete: (file: { name: string; category: string }) => void
    onMove: (file: { name: string; category: string }) => void
}

export function FileContextMenu({ children, file, onDelete, onMove }: FileContextMenuProps) {
    const handleShowInBrowser = () => {
        window.open(`${process.env.NEXT_PUBLIC_API_URL}${file.url}`, '_blank')
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                {children}
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48">
                <ContextMenuItem onClick={() => onMove(file)}>
                    <FolderInput className="mr-2 h-4 w-4" />
                    Move to...
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onDelete(file)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                </ContextMenuItem>
                <ContextMenuItem onClick={handleShowInBrowser}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Show in browser
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    )
}

