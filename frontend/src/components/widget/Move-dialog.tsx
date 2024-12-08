"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useTranslation } from 'react-i18next'


interface MoveDialogProps {
    isOpen: boolean
    onClose: () => void
    onMove: (category: string) => void
    categories: string[]
    currentCategory: string
}

export function MoveDialog({ isOpen, onClose, onMove, categories, currentCategory }: MoveDialogProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>(currentCategory)
    const { t } = useTranslation();
    const handleMove = () => {
        onMove(selectedCategory)
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('locker.dialog.move.title')}</DialogTitle>
                    <DialogDescription>
                        {t('locker.dialog.move.desc')}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                            <SelectValue placeholder={t('locker.dialog.move.selector')}/>
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map((category) => (
                                <SelectItem key={category} value={category}>
                                    {category}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={onClose}>{t('locker.dialog.move.cancel')}</Button>
                        <Button onClick={handleMove}>{t('locker.dialog.move.move')}</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

