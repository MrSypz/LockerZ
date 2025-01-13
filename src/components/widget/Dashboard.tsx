"use client"

import React, { useEffect, useState } from 'react'
import { FolderOpen, ImageIcon, ChevronDown, Lightbulb, HardDrive} from 'lucide-react'
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useTranslation } from 'react-i18next'
import { invoke } from "@tauri-apps/api/core"
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

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
  const { t } = useTranslation();
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
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastSelectedCategory', categoryName);
    }
    router.push('/locker');
  };

  const statsItems = [
    { icon: ImageIcon, label: t("dashboard.content.totalimg"), value: stats.total_images.toString(), color: "bg-blue-500" },
    { icon: FolderOpen, label: t("dashboard.content.category"), value: stats.categories.toString(), color: "bg-green-500" },
    { icon: HardDrive, label: t("dashboard.content.storageused"), value: formatBytes(stats.storage_used), color: "bg-purple-500" },
  ];

  return (
      <div className="space-y-6">
        <div className="p-6 space-y-8">
          <div className="flex flex-col space-y-4">
            <h1 className="text-3xl font-bold gradient-text">{t('dashboard.header')}</h1>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statsItems.map((stat) => (
                <Card key={stat.label} className="overflow-hidden transition-all hover:shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-full ${stat.color}`}>
                        <stat.icon size={24} className="text-white"/>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <p className="text-2xl font-bold mt-2 text-primary">{stat.value}</p>
                      </div>
                    </div>
                  </CardContent>
              </Card>
              ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.dailyTip')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Lightbulb className="text-yellow-500" />
                <p>{dailyTip}</p>
              </div>
            </CardContent>
          </Card>
          <Collapsible
              open={isOpen}
              onOpenChange={setIsOpen}
              className="w-full space-y-2"
          >
            <div className="flex items-center justify-between space-x-4 px-4">
              <CollapsibleTrigger asChild>
                <Button variant="ghost"
                        className="p-0 hover:bg-transparent flex items-center space-x-2 w-full justify-start"
                >
                  <FolderOpen className="h-5 w-5"/>
                  <span className="text-lg font-semibold">{t('dashboard.content.categories')}</span>
                  <ChevronDown className={`h-5 w-5 transition-transform duration-300 ease-in-out ml-auto ${
                      isOpen ? "transform rotate-180" : ""
                  }`}/>
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="space-y-2 collapsible-content">
              <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: { transition: { staggerChildren: 0.05 } },
                  }}
              >
                {categories.map((category) => (
                    <motion.div
                        key={category.name}
                        variants={{
                          hidden: { opacity: 0, y: 20 },
                          visible: { opacity: 1, y: 0 },
                        }}
                    >
                      <Card
                          className="overflow-hidden transition-all hover:shadow-lg cursor-pointer"
                          onClick={() => handleCategoryClick(category.name)}
                      >
                        <CardContent className="p-4">
                          <h3 className="text-lg font-semibold">{category.name}</h3>
                          <p className="text-sm text-muted-foreground">{category.fileCount} files</p>
                          <p className="text-sm text-muted-foreground">{formatBytes(category.size)}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                ))}
              </motion.div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
  )
}