"use client"

import React, { useEffect, useState } from 'react';
import {
    FolderOpen, ImageIcon, ChevronDown, Lightbulb,
    HardDrive, Search, Grid, LayoutGrid, Image
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from 'react-i18next';
import { invoke } from "@tauri-apps/api/core";
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface Category {
    name: string
    file_count: number
    size: number
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
];

export function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function Dashboard() {
    const { t } = useTranslation();
    const [categories, setCategories] = useState<Category[]>([]);
    const [stats, setStats] = useState<Stats>({
        total_images: 0,
        categories: 0,
        storage_used: 0
    });
    const [dailyTip, setDailyTip] = useState("");
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchTerm, setSearchTerm] = useState("");
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
        localStorage.setItem("lastSelectedCategory", categoryName);
        router.push("/locker");
    };

    const filteredCategories = categories.filter(category =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const statsItems = [
        { icon: ImageIcon, label: t("dashboard.content.totalimg"), value: stats.total_images.toString() },
        { icon: FolderOpen, label: t("dashboard.content.category"), value: stats.categories.toString() },
        { icon: HardDrive, label: t("dashboard.content.storageused"), value: formatBytes(stats.storage_used) },
    ];

    const CategoryCard = ({ category }: { category: Category }) => {
        return (
            <Card
                className="overflow-hidden transition-all hover:shadow-lg cursor-pointer border-2 hover:border-primary/50"
                onClick={() => handleCategoryClick(category.name)}
            >
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                        <span className="truncate">{category.name}</span>
                        <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Image className="h-5 w-5 text-primary" />
                            <span className="text-2xl font-bold">{category.file_count}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">images</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <HardDrive className="h-4 w-4" />
                            <span>{formatBytes(category.size)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="container mx-auto p-6 space-y-8">
            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-8"
            >
                <h1 className="text-4xl font-bold gradient-text mb-2">{t("dashboard.header")}</h1>
                <p className="text-muted-foreground">{t("dashboard.subheader")}</p>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {statsItems.map((stat, index) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                        <Card className="hover:shadow-lg transition-all duration-200">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                                <stat.icon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stat.value}</div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Daily Tip Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
            >
                <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lightbulb className="h-5 w-5 text-yellow-500" />
                            {t("dashboard.dailyTip")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{dailyTip}</p>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Categories Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="space-y-4"
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold">{t("dashboard.content.categories")}</h2>
                    <div className="flex items-center gap-4">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search categories..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                            <Button
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('grid')}
                                className="px-2"
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                                <Button
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('list')}
                                className="px-2"
                            >
                                <Grid className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={viewMode}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={
                            viewMode === 'grid'
                                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                                : "space-y-4"
                        }
                    >
                        {filteredCategories.map((category) => (
                            <motion.div
                                key={category.name}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                whileHover={{ scale: 1.02 }}
                                transition={{ duration: 0.2 }}
                            >
                                <CategoryCard category={category} />
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatePresence>

                {filteredCategories.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-8"
                    >
                        <p className="text-muted-foreground">No categories found matching your search.</p>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}