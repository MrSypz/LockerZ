"use client"

import { useEffect, useState } from "react"
import {
    FolderOpen,
    ImageIcon,
    HardDrive,
    Search,
    Grid,
    LayoutGrid,
    Image,
    PlusCircle,
    ChevronRight,
    X,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTranslation } from "react-i18next"
import { invoke } from "@tauri-apps/api/core"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { OptimizedImage } from "@/components/widget/ImageProcessor"
import { type CategoryIcon, DatabaseService } from "@/hooks/use-database"

interface Category {
    name: string
    file_count: number
    size: number
}

interface Stats {
    total_images: number
    categories: number
    storage_used: number
}

export function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

export default function Dashboard() {
    const { t } = useTranslation()
    const [categories, setCategories] = useState<Category[]>([])
    const [stats, setStats] = useState<Stats>({
        total_images: 0,
        categories: 0,
        storage_used: 0,
    })
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
    const [searchTerm, setSearchTerm] = useState("")
    const [isSearchFocused, setIsSearchFocused] = useState(false)
    const router = useRouter()

    useEffect(() => {
        async function fetchData() {
            try {
                const [categoriesData, statsData] = await Promise.all([invoke("get_categories"), invoke("get_stats")])
                setCategories(categoriesData as Category[])
                setStats(statsData as Stats)
            } catch (error) {
                console.error("Failed to fetch data:", error)
            }
        }

        fetchData()
    }, [])

    const handleCategoryClick = (categoryName: string) => {
        localStorage.setItem("lastSelectedCategory", categoryName)
        router.push("/locker")
    }

    const filteredCategories = categories.filter((category) =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase()),
    )

    const CategoryCard = ({ category }: { category: Category }) => {
        const [categoryIcon, setCategoryIcon] = useState<CategoryIcon | null>(null)
        const db = new DatabaseService()

        useEffect(() => {
            const loadCategoryIcon = async () => {
                try {
                    const icon = await db.getCategoryIcon(category.name)
                    setCategoryIcon(icon)
                } catch (error) {
                    console.error("Failed to load category icon:", error)
                }
            }

            loadCategoryIcon()
        }, [category.name])

        const IconComponent = () => {
            if (categoryIcon && categoryIcon.relative_path && categoryIcon.filename) {
                const iconPath = `${categoryIcon.relative_path}/${categoryIcon.filename}`
                return (
                    <div className="relative w-full h-36 overflow-hidden bg-primary/10 flex items-center justify-center">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <OptimizedImage
                            src={iconPath}
                            alt={category.name}
                            width={600}
                            height={400}
                            quality={100}
                        />
                    </div>
                )
            }
            return (
                <div className="w-full h-36 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/20 flex items-center justify-center">
                    <FolderOpen className="h-16 w-16 text-primary/70" />
                </div>
            )
        }

        return (
            <motion.div
                whileHover={{
                    y: -5,
                    transition: { duration: 0.2 },
                }}
                className="h-full"
            >
                <Card className="overflow-hidden h-full border shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group">
                    <IconComponent />
                    <CardContent className="p-5 flex-grow relative">
                        <div className="absolute -top-6 right-4">
                            <div className="bg-primary text-primary-foreground font-medium text-xs px-3 py-1.5 rounded-full shadow-md">
                                {category.file_count} {category.file_count === 1 ? "image" : "images"}
                            </div>
                        </div>
                        <h3 className="font-semibold text-lg mt-2 line-clamp-1">{category.name}</h3>
                        <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
                            <HardDrive className="h-3.5 w-3.5" />
                            <span>{formatBytes(category.size)}</span>
                        </div>
                    </CardContent>
                    <CardFooter className="p-5 pt-0 mt-auto">
                        <Button
                            variant="outline"
                            className="w-full group relative overflow-hidden"
                            onClick={() => handleCategoryClick(category.name)}
                        >
              <span className="relative z-10 group-hover:text-primary-foreground transition-colors duration-300">
                Browse
              </span>
                            <ChevronRight className="ml-2 h-4 w-4 relative z-10 transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary-foreground" />
                            <span className="absolute inset-0 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
                        </Button>
                    </CardFooter>
                </Card>
            </motion.div>
        )
    }

    const CategoryListItem = ({ category }: { category: Category }) => {
        const [categoryIcon, setCategoryIcon] = useState<CategoryIcon | null>(null)
        const db = new DatabaseService()

        useEffect(() => {
            const loadCategoryIcon = async () => {
                try {
                    const icon = await db.getCategoryIcon(category.name)
                    setCategoryIcon(icon)
                } catch (error) {
                    console.error("Failed to load category icon:", error)
                }
            }

            loadCategoryIcon()
        }, [category.name])

        return (
            <Card
                className="overflow-hidden cursor-pointer hover:bg-muted/50 transition-all duration-300 group border hover:border-primary/30 hover:shadow-md"
                onClick={() => handleCategoryClick(category.name)}
            >
                <CardContent className="p-4 flex items-center gap-5">
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0 shadow-sm">
                        {categoryIcon && categoryIcon.relative_path && categoryIcon.filename ? (
                            <>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <OptimizedImage
                                    src={`${categoryIcon.relative_path}/${categoryIcon.filename}`}
                                    alt={category.name}
                                    width={200}
                                    height={200}
                                />
                            </>
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/5 via-primary/10 to-primary/20 flex items-center justify-center">
                                <FolderOpen className="h-10 w-10 text-primary/70" />
                            </div>
                        )}
                    </div>
                    <div className="flex-grow min-w-0">
                        <h3 className="font-medium text-lg truncate group-hover:text-primary transition-colors duration-200">
                            {category.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <Image className="h-3.5 w-3.5 text-primary" />
                                <span>
                  {category.file_count} {category.file_count === 1 ? "image" : "images"}
                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <HardDrive className="h-3.5 w-3.5 text-primary" />
                                <span>{formatBytes(category.size)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-primary/10 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <ChevronRight className="h-5 w-5 text-primary transition-transform group-hover:translate-x-0.5" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="container mx-auto p-6 space-y-8">
            {/* Header Section - Original Design */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-8"
            >
                <h1 className="text-4xl font-bold gradient-text-header mb-2">{t("dashboard.header")}</h1>
                <p className="text-muted-foreground">{t("dashboard.subheader")}</p>
            </motion.div>

            {/* Stats Grid - Original Design */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { icon: ImageIcon, label: t("dashboard.content.totalimg"), value: stats.total_images.toString() },
                    { icon: FolderOpen, label: t("dashboard.content.category"), value: stats.categories.toString() },
                    { icon: HardDrive, label: t("dashboard.content.storageused"), value: formatBytes(stats.storage_used) },
                ].map((stat, index) => (
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

            {/* Categories Section - Enhanced Visual Design without flickering */}
            <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-background via-background to-muted/30">
                <CardHeader className="pb-2 pt-6 px-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-2xl font-bold">Categories</CardTitle>
                            <CardDescription className="text-muted-foreground mt-1">
                                Browse and manage your image categories
                            </CardDescription>
                        </div>
                        <div className="flex flex-col md:flex-row gap-3">
                            <div
                                className={`relative transition-all duration-300 ${isSearchFocused ? "w-full md:w-80" : "w-full md:w-64"}`}
                            >
                                <div
                                    className={`absolute left-3 top-1/2 transform -translate-y-1/2 transition-all duration-300 ${isSearchFocused ? "text-primary" : "text-muted-foreground"}`}
                                >
                                    <Search className="h-4 w-4" />
                                </div>
                                {searchTerm && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 hover:bg-destructive/10 hover:text-destructive transition-colors"
                                        onClick={() => setSearchTerm("")}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                                <Input
                                    placeholder="Search categories..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 pr-7 border-muted-foreground/20 focus:border-primary transition-all duration-300 bg-background/80 backdrop-blur-sm"
                                    onFocus={() => setIsSearchFocused(true)}
                                    onBlur={() => setIsSearchFocused(false)}
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    onClick={() => router.push("/category")}
                                    size="sm"
                                    className="gap-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-300"
                                >
                                    <PlusCircle className="h-3.5 w-3.5" />
                                    <span>New Category</span>
                                </Button>
                                <div className="hidden md:flex items-center gap-1 bg-muted/80 backdrop-blur-sm rounded-lg p-1 shadow-sm">
                                    <Button
                                        variant={viewMode === "grid" ? "secondary" : "ghost"}
                                        size="sm"
                                        onClick={() => setViewMode("grid")}
                                        className="h-8 w-8 p-0 rounded-md"
                                        title="Grid view"
                                    >
                                        <LayoutGrid className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant={viewMode === "list" ? "secondary" : "ghost"}
                                        size="sm"
                                        onClick={() => setViewMode("list")}
                                        className="h-8 w-8 p-0 rounded-md"
                                        title="List view"
                                    >
                                        <Grid className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-2 md:p-6">
                    <div className="h-[480px] overflow-hidden hover:overflow-y-auto pr-4 transition-all duration-300">
                        {filteredCategories.length > 0 ? (
                            <div
                                className={
                                    viewMode === "grid"
                                        ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5"
                                        : "space-y-4"
                                }
                            >
                                {filteredCategories.map((category) => (
                                    <div key={category.name}>
                                        {viewMode === "grid" ? (
                                            <CategoryCard category={category} />
                                        ) : (
                                            <CategoryListItem category={category} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[400px] text-center p-4">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-muted/80 to-muted flex items-center justify-center mb-5 shadow-inner">
                                    <FolderOpen className="h-10 w-10 text-muted-foreground/70" />
                                </div>
                                <h3 className="text-xl font-medium mb-2">No categories found</h3>
                                <p className="text-muted-foreground mb-6 max-w-md">
                                    {searchTerm
                                        ? `No results matching "${searchTerm}"`
                                        : "You haven't created any categories yet. Create your first category to start organizing your images."}
                                </p>
                                {!searchTerm && (
                                    <Button
                                        onClick={() => router.push("/category")}
                                        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-300"
                                    >
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Create Category
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

