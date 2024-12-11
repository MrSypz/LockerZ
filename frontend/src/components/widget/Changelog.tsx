"use client"

import { motion } from "framer-motion"
import ReactMarkdown from 'react-markdown'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Wrench, Zap, Gauge, Rocket, PencilLine, ImageIcon } from 'lucide-react'
import React from "react"
import { ImageComparison } from "@/components/widget/Image-comparison"

interface ChangelogSection {
    title: string
    content: string
    type?: string
    image?: string
    images?: {
        before: string
        after: string
    }
}

interface ChangelogItem {
    version: string
    date: string
    sections: ChangelogSection[]
}

interface ChangelogProps {
    items: ChangelogItem[]
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

export function Changelog({ items }: ChangelogProps) {
    return (
        <Card className="w-full max-w-[90vw] lg:max-w-[80vw] xl:max-w-[1200px] mx-auto h-[90vh] flex flex-col">
            <CardHeader className="flex-shrink-0">
                <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">Changelog</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden">
                <ScrollArea className="h-full pr-4">
                    <div className="space-y-8">
                        {items.map((item, index) => (
                            <motion.div
                                key={item.version}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                            >
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="text-base sm:text-lg font-semibold text-blue-500 dark:text-blue-400">
                                        [{item.version}]
                                    </div>
                                    <span className="text-sm text-muted-foreground">{item.date}</span>
                                </div>
                                <Card>
                                    <CardContent className="grid gap-6 p-4 sm:p-6">
                                        {item.sections.map((section, sectionIndex) => {
                                            const Icon = iconMap[section.title] || Sparkles
                                            return (
                                                <div key={sectionIndex} className="space-y-3">
                                                    <h3 className={`flex items-center space-x-2 text-base sm:text-lg font-medium ${getTypeColor(section.type)}`}>
                                                        <Icon className="flex-shrink-0" />
                                                        <span>{section.title}</span>
                                                    </h3>
                                                    <div className="text-sm text-muted-foreground pl-5">
                                                        <ReactMarkdown
                                                            components={{
                                                                p: ({ children }) => <p className="mb-2">{children}</p>,
                                                                code: ({ children }) => (
                                                                    <code className="px-1 py-0.5 bg-muted rounded text-rose-500 dark:text-rose-400">
                                                                        {children}
                                                                    </code>
                                                                ),
                                                            }}
                                                        >
                                                            {section.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                    {section.image && (
                                                        <div className="mt-4">
                                                            <img src={section.image} alt={section.title} className="w-full h-auto rounded-md" />
                                                        </div>
                                                    )}
                                                    {section.images && (
                                                        <div className="mt-4">
                                                            <ImageComparison
                                                                beforeSrc={section.images.before}
                                                                afterSrc={section.images.after}
                                                                beforeAlt={`${section.title} - Before`}
                                                                afterAlt={`${section.title} - After`}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}

