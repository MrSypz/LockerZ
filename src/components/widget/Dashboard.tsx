"use client"

import React, {useEffect, useState} from 'react'
import {FolderOpen, ImageIcon, ChevronDown, Lightbulb, HardDrive} from 'lucide-react'
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "@/components/ui/collapsible"
import {useTranslation} from 'react-i18next'
import {invoke} from "@tauri-apps/api/core"
import {useRouter} from 'next/navigation'
import {motion} from 'framer-motion'

interface Category {
    name: string;
    fileCount: number;
    size: number;
}

interface Stats {
    total_images: number;
    categories: number;
    storage_used: number;
}

const dailyTips = [
    "Organize your images by theme for easier browsing.",
    "You can type #(your_tags) for search you avalible tags!.",
    "Try combine @(categories) and #(tags)!",
    "Try to manage your tags and categories",
    "You can delete the cache for optimize the storage!",
    "Ctrl + Spacebar for shortcut to open sort type",
    "On dashboard categories you can click on category to navigate to the category page"
]

export function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function Dashboard() {
    const {t} = useTranslation();
    const [categories, setCategories] = useState<Category[]>([]);
    const [stats, setStats] = useState<Stats>({
        total_images: 0,
        categories: 0,
        storage_used: 0
    });
    const [dailyTip, setDailyTip] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        async function fetchData() {
            try {
                const [categoriesData, statsData] = await Promise.all([
                    invoke("get_categories"),
                    invoke("get_stats")
                ]);
                setCategories(categoriesData as Category[]);
                setStats(statsData as Stats);
            } catch (error) {
                console.error('Failed to fetch data:', error);
            }
        }

        setDailyTip(dailyTips[Math.floor(Math.random() * dailyTips.length)]);

        fetchData();
    }, []);

    const handleCategoryClick = (categoryName: string) => {
        if (typeof window !== "undefined") {
            localStorage.setItem("lastSelectedCategory", categoryName)
        }
        router.push("/locker")
    }

    const statsItems = [
        {icon: ImageIcon, label: t("dashboard.content.totalimg"), value: stats.total_images.toString()},
        {icon: FolderOpen, label: t("dashboard.content.category"), value: stats.categories.toString()},
        {icon: HardDrive, label: t("dashboard.content.storageused"), value: formatBytes(stats.storage_used)},
    ];

    return (
        <div className="container mx-auto p-6 space-y-8">
            <motion.div initial={{opacity: 0, y: -20}} animate={{opacity: 1, y: 0}} transition={{duration: 0.5}}>
                <h1 className="text-4xl font-bold gradient-text mb-2">{t("dashboard.header")}</h1>
                <p className="text-muted-foreground">{t("dashboard.subheader")}</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {statsItems.map((stat, index) => (
                    <motion.div
                        key={stat.label}
                        initial={{opacity: 0, y: 20}}
                        animate={{opacity: 1, y: 0}}
                        transition={{duration: 0.5, delay: index * 0.1}}
                    >
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                                <stat.icon className="h-4 w-4 text-muted-foreground"/>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stat.value}</div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <motion.div
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.5, delay: 0.3}}
            >
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lightbulb className="h-5 w-5 text-yellow-500"/>
                            {t("dashboard.dailyTip")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{dailyTip}</p>
                    </CardContent>
                </Card>
            </motion.div>

            <motion.div
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.5, delay: 0.5}}
            >
                <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full space-y-2">
                    <Card>
                        <CardHeader>
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" className="w-full justify-between">
                                    <CardTitle className="flex items-center gap-2">
                                        <FolderOpen className="h-5 w-5"/>
                                        {t("dashboard.content.categories")}
                                    </CardTitle>
                                    <ChevronDown
                                        className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}/>
                                </Button>
                            </CollapsibleTrigger>
                        </CardHeader>
                        <CollapsibleContent>
                            <CardContent className="p-0">
                                <div className="max-h-96 overflow-y-auto p-6">
                                    <motion.div
                                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                                        initial="hidden"
                                        animate="visible"
                                        variants={{
                                            visible: {transition: {staggerChildren: 0.05}},
                                        }}
                                    >
                                        {categories.map((category) => (
                                            <motion.div
                                                key={category.name}
                                                variants={{
                                                    hidden: {opacity: 0, y: 20},
                                                    visible: {opacity: 1, y: 0},
                                                }}
                                            >
                                                <Card
                                                    className="overflow-hidden transition-all hover:shadow-lg cursor-pointer"
                                                    onClick={() => handleCategoryClick(category.name)}
                                                >
                                                    <CardHeader>
                                                        <CardTitle>{category.name}</CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm text-muted-foreground">
                                                                {category.fileCount} files
                                                            </span>
                                                            <span className="text-sm font-medium">
                                                                {formatBytes(category.size)}
                                                            </span>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                </div>
                            </CardContent>
                        </CollapsibleContent>
                    </Card>
                </Collapsible>
            </motion.div>
        </div>
    )
}