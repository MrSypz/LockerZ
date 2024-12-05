"use client"

import { useEffect, useState } from 'react'
import { BarChart, FolderOpen, Image } from 'lucide-react'

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalImages: 0,
    categories: 0,
    storageUsed: 0
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [categoriesResponse, statsResponse] = await Promise.all([
          fetch('http://localhost:3001/categories'),
          fetch('http://localhost:3001/stats')
        ]);
        const categoriesData = await categoriesResponse.json();
        const statsData = await statsResponse.json();

        setCategories(categoriesData);
        setStats(statsData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    }

    fetchData();
  }, []);

  const statsItems = [
    { icon: Image, label: "Total Images", value: stats.totalImages.toString() },
    { icon: FolderOpen, label: "Categories", value: stats.categories.toString() },
    { icon: BarChart, label: "Storage Used", value: formatBytes(stats.storageUsed) },
  ];

  return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statsItems.map((stat) => (
              <div
                  key={stat.label}
                  className="glass-effect rounded-lg p-6 card-shadow hover-lift"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-2 gradient-text">
                      {stat.value}
                    </p>
                  </div>
                  <stat.icon size={32} className="text-primary" />
                </div>
              </div>
          ))}
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4 gradient-text">Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
                <div key={category.name} className="glass-effect rounded-lg p-4 card-shadow hover-lift">
                  <h3 className="text-lg font-semibold">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">{category.fileCount} files</p>
                  <p className="text-sm text-muted-foreground">{formatBytes(category.size)}</p>
                </div>
            ))}
          </div>
        </div>
      </div>
  )
}

