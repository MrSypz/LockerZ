"use client"

import { motion } from "framer-motion"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Wrench, Zap, Gauge, Rocket } from 'lucide-react'

interface ChangelogItem {
    version: string
    date: string
    features?: string[]
    fixes?: string[]
    qol?: string[]
    performance?: string[]
    optimize?: string[]
}

interface ChangelogProps {
    items: ChangelogItem[]
}

const iconMap = {
    features: Sparkles,
    fixes: Wrench,
    qol: Zap,
    performance: Gauge,
    optimize: Rocket
}

export function Changelog({ items }: ChangelogProps) {
    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="text-3xl font-bold tracking-tight text-primary">Changelog</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-8">
                        {items.map((item, index) => (
                            <motion.div
                                key={item.version}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                            >
                                <div className="flex items-center space-x-3 mb-4">
                                    <Badge variant="secondary" className="text-lg px-3 py-1">
                                        v{item.version}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">{item.date}</span>
                                </div>
                                <Card>
                                    <CardContent className="grid gap-6 p-6">
                                        {(Object.keys(iconMap) as Array<keyof typeof iconMap>).map((key) => {
                                            const Icon = iconMap[key]
                                            const changes = item[key]
                                            if (!changes || changes.length === 0) return null
                                            return (
                                                <div key={key} className="space-y-3">
                                                    <h3 className="flex items-center space-x-2 text-lg font-medium">
                                                        <Icon className="h-5 w-5 text-primary" />
                                                        <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                                                    </h3>
                                                    <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground pl-5">
                                                        {changes.map((change, changeIndex) => (
                                                            <motion.li
                                                                key={changeIndex}
                                                                initial={{ opacity: 0, x: -20 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ duration: 0.3, delay: changeIndex * 0.05 }}
                                                                className="leading-relaxed"
                                                            >
                                                                {change}
                                                            </motion.li>
                                                        ))}
                                                    </ul>
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

