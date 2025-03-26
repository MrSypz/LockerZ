"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTranslation } from "react-i18next"
import { motion, AnimatePresence } from "framer-motion"
import { Search, FolderIcon } from "lucide-react"
import { Input } from "@/components/ui/input"

interface MoveDialogProps {
    isOpen: boolean
    onCloseAction: () => void
    onMoveAction: (category: string) => void
    categories: string[]
    currentCategory: string
    title?: string
}

export function MoveDialog({
                               isOpen,
                               onCloseAction,
                               onMoveAction,
                               categories,
                               currentCategory,
                               title,
                           }: MoveDialogProps) {
    const { t } = useTranslation()
    const [selectedCategory, setSelectedCategory] = useState<string>("")
    const [searchTerm, setSearchTerm] = useState("")

    useEffect(() => {
        if (isOpen) {
            setSelectedCategory("")
            setSearchTerm("")
        }
    }, [isOpen])

    const filteredCategories = categories
        .filter((category) => category !== currentCategory)
        .filter((category) => category.toLowerCase().includes(searchTerm.toLowerCase()))

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05,
            },
        },
    }

    const item = {
        hidden: { opacity: 0, y: 10 },
        show: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.15,
            },
        },
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onCloseAction()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{title || t("locker.dialog.move.title")}</DialogTitle>
                </DialogHeader>

                <div className="relative my-2">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t("categories.page.search")}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>

                <div className="py-4">
                    <ScrollArea className="h-[300px] pr-4">
                        <RadioGroup value={selectedCategory} onValueChange={setSelectedCategory}>
                            <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
                                <AnimatePresence>
                                    {filteredCategories.map((category) => (
                                        <motion.div
                                            key={category}
                                            variants={item}
                                            layout
                                            className="flex items-center space-x-2 mb-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                                        >
                                            <RadioGroupItem value={category} id={category} />
                                            <Label htmlFor={category} className="cursor-pointer flex items-center gap-2 flex-1">
                                                <FolderIcon className="h-4 w-4 text-muted-foreground" />
                                                <span className="flex-1">{category}</span>
                                            </Label>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {filteredCategories.length === 0 && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex flex-col items-center justify-center py-8 text-muted-foreground"
                                    >
                                        <p>{searchTerm ? t("categories.empty.noResults") : t("categories.empty.noCategories")}</p>
                                    </motion.div>
                                )}
                            </motion.div>
                        </RadioGroup>
                    </ScrollArea>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onCloseAction}>
                        {t("locker.dialog.move.cancel")}
                    </Button>
                    <Button onClick={() => onMoveAction(selectedCategory)} disabled={!selectedCategory}>
                        {t("locker.dialog.move.click")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

