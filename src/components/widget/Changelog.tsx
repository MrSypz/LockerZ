"use client"

import React, {useEffect, useState} from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Wrench, Zap, Gauge, Rocket, PencilLine, ImageIcon } from 'lucide-react'
import { cn } from "@/lib/utils"

interface ChangelogSection {
    title: string
    content: string
    type?: string
    image?: string
}

interface ChangelogItem {
    version: string
    date: string
    sections: ChangelogSection[]
}

const iconMap: { [key: string]: React.ComponentType } = {
    Features: Sparkles,
    Fixes: Wrench,
    Rewrite: PencilLine,
    "Quality of Life": Zap,
    Performance: Gauge,
    Optimize: Rocket,
    "Image Comparison": ImageIcon,
}

const getTypeColor = (type: string = 'default') => {
    const colors: { [key: string]: string } = {
        feature: 'text-blue-500 dark:text-blue-400',
        concept: 'text-purple-500 dark:text-purple-400',
        category: 'text-green-500 dark:text-green-400',
        preview: 'text-amber-500 dark:text-amber-400',
        code: 'text-rose-500 dark:text-rose-400',
        default: 'text-foreground'
    }
    return colors[type] || colors.default
}

export function Changelog() {
    const [items, setItems] = useState<ChangelogItem[]>([])
    const [activeVersion, setActiveVersion] = useState<string>("")
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch("/changelog.json")
            .then((response) => response.json())
            .then((data) => {
                setItems(data)
                setActiveVersion(data[0]?.version || "")
                setLoading(false)
            })
            .catch((error) => {
                console.error("Error loading changelog:", error)
                setLoading(false)
            })
    }, [])

    if (loading) {
        return (
            <Card className="w-full max-w-[90vw] lg:max-w-[80vw] xl:max-w-[1200px] mx-auto h-[90vh] flex items-center justify-center">
                <div className="text-lg text-muted-foreground">Loading changelog...</div>
            </Card>
        )
    }

    if (items.length === 0) {
        return (
            <Card className="w-full max-w-[90vw] lg:max-w-[80vw] xl:max-w-[1200px] mx-auto h-[90vh] flex items-center justify-center">
                <div className="text-lg text-muted-foreground">No changelog entries found.</div>
            </Card>
        )
    }


    return (
        <Card className="w-full max-w-[90vw] lg:max-w-[80vw] xl:max-w-[1200px] mx-auto h-[90vh] flex flex-col">
            <CardHeader className="flex-shrink-0 border-b">
                <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">Changelog</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden flex p-0">
                <div className="w-1/5 border-r border-gray-200 dark:border-gray-700">
                    <ScrollArea className="h-full">
                        <div className="relative pl-8 pr-4 py-6">
                            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-primary/10" />
                            <AnimatePresence>
                                {items.map((item, index) => (
                                    <motion.div
                                        key={item.version}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ duration: 0.3, delay: index * 0.1 }}
                                        className={cn(
                                            "mb-8 cursor-pointer relative",
                                            activeVersion === item.version
                                                ? "text-primary"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                        onClick={() => setActiveVersion(item.version)}
                                    >
                                        <motion.div
                                            className={cn(
                                                "absolute left-[-22px] top-1 w-5 h-5 rounded-full border-2 border-primary",
                                                activeVersion === item.version
                                                    ? "bg-primary shadow-glow"
                                                    : "bg-background"
                                            )}
                                            layoutId="activeVersion"
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                        <div className="text-sm font-semibold">{item.version}</div>
                                        <div className="text-xs mt-1">{item.date}</div>
                                        {activeVersion === item.version && (
                                            <motion.div
                                                className="absolute left-[-30px] top-1 w-7 h-7 rounded-full border-4 border-primary/20"
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0.8, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                            />
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </ScrollArea>
                </div>
                <div className="w-4/5 pl-8 pr-4 py-6">
                    <ScrollArea className="h-full">
                        <AnimatePresence mode="wait">
                            {items.map((item) => (
                                activeVersion === item.version && (
                                    <motion.div
                                        key={item.version}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ duration: 0.3 }}
                                        className="space-y-6"
                                    >
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h2 className="text-3xl font-bold text-primary">{item.version}</h2>
                                                <p className="text-sm text-muted-foreground">{item.date}</p>
                                            </div>
                                        </div>
                                        {item.sections.map((section, sectionIndex) => {
                                            const Icon = iconMap[section.title] || Sparkles
                                            return (
                                                <Card key={sectionIndex} className="overflow-hidden border-l-4 border-l-primary">
                                                    <CardHeader className={cn("py-3", getTypeColor(section.type))}>
                                                        <CardTitle className="text-lg flex items-center space-x-2">
                                                            <Icon />
                                                            <span>{section.title}</span>
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="pt-4">
                                                        <div
                                                            className="text-sm text-muted-foreground"
                                                            dangerouslySetInnerHTML={{ __html: section.content }}
                                                        />
                                                        {section.image && (
                                                            <div className="mt-4">
                                                                <img src={section.image} alt={section.title} className="w-full h-auto rounded-md" />
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            )
                                        })}
                                    </motion.div>
                                )
                            ))}
                        </AnimatePresence>
                    </ScrollArea>
                </div>
            </CardContent>
        </Card>
    )
}

