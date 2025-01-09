"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useTranslation } from 'react-i18next'
import { Category } from "@/types/file"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Check } from 'lucide-react'

interface MoveDialogProps {
    isOpen: boolean
    onCloseAction: () => void
    onMoveAction: (category: string) => void
    categories: Category[]
    currentCategory: string
}

export function MoveDialog({ isOpen, onCloseAction, onMoveAction, categories, currentCategory }: MoveDialogProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>(currentCategory)
    const [searchQuery, setSearchQuery] = useState("")
    const { t } = useTranslation()

    const filteredCategories = useMemo(() => {
        return categories.filter(category =>
            category.toLowerCase().includes(searchQuery.toLowerCase())
        )
    }, [categories, searchQuery])

    const handleMove = () => {
        onMoveAction(selectedCategory)
        onCloseAction()
    }

    return (
        <Dialog open={isOpen} onOpenChange={onCloseAction}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('locker.dialog.move.title')}</DialogTitle>
                    <DialogDescription>
                        {t('locker.dialog.move.desc')}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Command>
                        <CommandInput
                            placeholder={t('locker.dialog.move.search')}
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                        />
                        <CommandEmpty>{t('locker.dialog.move.noResults')}</CommandEmpty>
                        <CommandGroup>
                            <ScrollArea className="h-[200px]">
                                {filteredCategories.map((category) => (
                                    <CommandItem
                                        key={category}
                                        value={category}
                                        onSelect={() => setSelectedCategory(category)}
                                    >
                                        <motion.div
                                            className="w-full"
                                            initial={false}
                                            animate={{
                                                backgroundColor: selectedCategory === category ? "rgb(59, 130, 246)" : "transparent",
                                            }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <Button
                                                variant="ghost"
                                                className={`w-full justify-start ${
                                                    selectedCategory === category ? "text-white" : ""
                                                }`}
                                            >
                                                <span className="mr-2">{category}</span>
                                                {selectedCategory === category && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </motion.div>
                                                )}
                                            </Button>
                                        </motion.div>
                                    </CommandItem>
                                ))}
                            </ScrollArea>
                        </CommandGroup>
                    </Command>
                    <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={onCloseAction}>{t('locker.dialog.move.cancel')}</Button>
                        <Button onClick={handleMove}>{t('locker.dialog.move.click')}</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

