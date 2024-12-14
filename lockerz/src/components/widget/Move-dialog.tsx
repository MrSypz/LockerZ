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
    onCloseAction: () => void
    onMoveAction: (category: string) => void
    categories: string[]
    currentCategory: string
}

export function MoveDialog({ isOpen, onCloseAction, onMoveAction, categories, currentCategory }: MoveDialogProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>(currentCategory)
    const { t } = useTranslation();
    const handleMove = () => {
        onMoveAction(selectedCategory)
        onCloseAction()
    }

    return (
        <Dialog open={isOpen} onOpenChange={onCloseAction}>
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
                        <Button variant="outline" onClick={onCloseAction}>{t('locker.dialog.move.cancel')}</Button>
                        <Button onClick={handleMove}>{t('locker.dialog.move.click')}</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

