"use client"

import { useEffect, useState } from 'react'
import { BarChart, FolderOpen, ImageIcon, ChevronDown } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useTranslation } from 'react-i18next'
import {API_URL} from "@/lib/zaphire";

interface Category {
  name: string;
  fileCount: number;
  size: number;
}

interface Stats {
  totalImages: number;
  categories: number;
  storageUsed: number;
}

function formatBytes(bytes: number, decimals = 2) {
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
    totalImages: 0,
    categories: 0,
    storageUsed: 0
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [categoriesResponse, statsResponse] = await Promise.all([
          fetch(`${API_URL}/categories`),
          fetch(`${API_URL}/stats`)
        ]);
        const categoriesData = await categoriesResponse.json();
        const statsData = await statsResponse.json(); // Corrected variable name here

        setCategories(categoriesData);
        setStats(statsData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    }

    fetchData();
  }, []);

  const statsItems = [
    { icon: ImageIcon, label: t("dashboard.content.totalimg"), value: stats.totalImages.toString() },
    { icon: FolderOpen, label: t("dashboard.content.category"), value: stats.categories.toString() },
    { icon: BarChart, label: t("dashboard.content.storageused"), value: formatBytes(stats.storageUsed) },
  ];

  return (
      <div className="space-y-6">
        <div className="p-6 space-y-8">
          <h1 className="text-3xl font-bold p-6 gradient-text">{t('dashboard.header')}</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statsItems.map((stat) => (
                <Card key={stat.label} className="overflow-hidden transition-all hover:shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <p className="text-2xl font-bold mt-2 text-primary">
                          {stat.value}
                        </p>
                      </div>
                      <stat.icon size={32} className="text-primary"/>
                    </div>
                  </CardContent>
                </Card>
            ))}
          </div>

          <Collapsible
              open={isOpen}
              onOpenChange={setIsOpen}
              className="w-full space-y-2"
          >
            <div className="flex items-center justify-between space-x-4 px-4">
              <CollapsibleTrigger asChild>
                <Button variant="ghost"
                        className="p-0 hover:bg-transparent flex items-center space-x-2 w-full justify-start">
                  <FolderOpen className="h-5 w-5"/>
                  <span className="text-lg font-semibold">{t('dashboard.content.categories')}</span>

                  <ChevronDown className={`h-5 w-5 transition-transform duration-300 ease-in-out ml-auto ${
                      isOpen ? "transform rotate-180" : ""
                  }`}/>
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="space-y-2 collapsible-content">
              <div className="rounded-md border px-4 py-3 font-mono text-sm shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((category) => (
                      <Card key={category.name}
                            className="overflow-hidden transition-all hover:shadow-lg animate-fadeIn">
                        <CardContent className="p-4">
                          <h3 className="text-lg font-semibold">{category.name}</h3>
                          <p className="text-sm text-muted-foreground">{category.fileCount} files</p>
                          <p className="text-sm text-muted-foreground">{formatBytes(category.size)}</p>
                        </CardContent>
                      </Card>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
  )
}

