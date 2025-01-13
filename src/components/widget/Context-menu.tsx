"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {Trash2, FolderInput, FolderOpen, Tag} from 'lucide-react'
import {useTranslation} from "react-i18next";

interface FileContextMenuProps {
    children: React.ReactNode
    file: {
        name: string
        category: string
    }
    onDeleteAction: (file: { name: string; category: string }) => void
    onMoveAction: (file: { name: string; category: string }) => void
    onViewAction: (file: { name: string; category: string }) => void
    onTagAction: (file:{name:string; category: string}) => void
}

export function FileContextMenu({ children, file, onDeleteAction, onMoveAction,onViewAction,onTagAction }: FileContextMenuProps) {
    const { t } = useTranslation();
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                {children}
            </ContextMenuTrigger>
            <AnimatePresence>
                <ContextMenuContent
                    className="w-56 overflow-hidden rounded-md border bg-popover/80 p-1 text-popover-foreground shadow-md backdrop-blur-sm"
                    asChild
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ContextMenuItem
                            onClick={() => onViewAction(file)}
                            className="flex cursor-pointer items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-accent/50"
                        >
                            <FolderOpen  className="mr-2 h-4 w-4" />
                            {t('locker.dialog.menu.viewpath')}
                        </ContextMenuItem>
                        <ContextMenuItem
                            onClick={() => onMoveAction(file)}
                            className="flex cursor-pointer items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-accent/50"
                        >
                            <FolderInput className="mr-2 h-4 w-4" />
                            {t('locker.dialog.menu.move')}
                        </ContextMenuItem>
                        <ContextMenuItem
                            onClick={() => onTagAction(file)}
                            className="flex cursor-pointer items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-accent/50"
                        >
                            <Tag className="mr-2 h-4 w-4" />
                            {t('locker.dialog.menu.tags')}
                        </ContextMenuItem>
                        <ContextMenuItem
                            onClick={() => onDeleteAction(file)}
                            className="flex cursor-pointer items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-accent/50 text-red-500 hover:text-red-600"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('locker.dialog.menu.delete')}
                        </ContextMenuItem>
                    </motion.div>
                </ContextMenuContent>
            </AnimatePresence>
        </ContextMenu>
    )
}

