import { useEffect, useState } from "react"
import {
    FolderOpen,
    ImageIcon,
    HardDrive,
    ChevronRight,
    PlusCircle,
    TrendingUp,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"
import { invoke, convertFileSrc } from "@tauri-apps/api/core"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { type CategoryIcon, DatabaseService } from "@/hooks/use-database"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
    Legend,
} from "recharts"

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
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

const CHART_COLORS = [
    "#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd",
    "#818cf8", "#93c5fd", "#67e8f9", "#6ee7b7",
]

const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-background/95 border border-border rounded-lg px-3 py-2 shadow-xl text-sm">
            <p className="font-medium mb-1 truncate max-w-[160px]">{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} className="text-muted-foreground">
                    {p.name === "size" ? formatBytes(p.value) : `${p.value} images`}
                </p>
            ))}
        </div>
    )
}

const CustomPieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0]
    return (
        <div className="bg-background/95 border border-border rounded-lg px-3 py-2 shadow-xl text-sm">
            <p className="font-medium">{d.name}</p>
            <p className="text-muted-foreground">{formatBytes(d.value)}</p>
            <p className="text-muted-foreground">{d.payload.file_count} images</p>
        </div>
    )
}

function CategoryThumbnail({ category }: { category: Category }) {
    const [icon, setIcon] = useState<CategoryIcon | null>(null)
    const db = new DatabaseService()

    useEffect(() => {
        db.getCategoryIcon(category.name)
            .then(setIcon)
            .catch(() => {})
    }, [category.name])

    if (icon?.relative_path && icon?.filename) {
        return (
            <img
                src={convertFileSrc(`${icon.relative_path}/${icon.filename}`)}
                alt={category.name}
                className="w-full h-full object-cover"
                loading="lazy"
            />
        )
    }
    return (
        <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
            <FolderOpen className="h-8 w-8 text-primary/60" />
        </div>
    )
}

export default function Dashboard() {
    const { t } = useTranslation()
    const [categories, setCategories] = useState<Category[]>([])
    const [stats, setStats] = useState<Stats>({ total_images: 0, categories: 0, storage_used: 0 })
    const router = useNavigate()

    useEffect(() => {
        Promise.all([invoke<Category[]>("get_categories"), invoke<Stats>("get_stats")])
            .then(([cats, s]) => {
                setCategories(cats)
                setStats(s)
            })
            .catch(console.error)
    }, [])

    const handleCategoryClick = (name: string) => {
        localStorage.setItem("lastSelectedCategory", name)
        router("/locker")
    }

    const topByCount = [...categories]
        .sort((a, b) => b.file_count - a.file_count)
        .slice(0, 8)

    const topBySize = [...categories]
        .sort((a, b) => b.size - a.size)
        .slice(0, 6)

    const avgImagesPerCategory = categories.length
        ? Math.round(stats.total_images / categories.length)
        : 0

    const largestCategory = categories.reduce(
        (acc, c) => (c.file_count > acc.file_count ? c : acc),
        { name: "—", file_count: 0, size: 0 }
    )

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <h1 className="text-4xl font-bold gradient-text-header mb-1">{t("dashboard.header")}</h1>
                <p className="text-muted-foreground">{t("dashboard.subheader")}</p>
            </motion.div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    {
                        icon: ImageIcon,
                        label: t("dashboard.content.totalimg"),
                        value: stats.total_images.toLocaleString(),
                        sub: `avg ${avgImagesPerCategory} per category`,
                        color: "text-indigo-400",
                    },
                    {
                        icon: FolderOpen,
                        label: t("dashboard.content.category"),
                        value: stats.categories.toLocaleString(),
                        sub: largestCategory.name !== "—" ? `largest: ${largestCategory.name}` : "no categories yet",
                        color: "text-violet-400",
                    },
                    {
                        icon: HardDrive,
                        label: t("dashboard.content.storageused"),
                        value: formatBytes(stats.storage_used),
                        sub: categories.length ? `avg ${formatBytes(stats.storage_used / categories.length)} per category` : "",
                        color: "text-sky-400",
                    },
                    {
                        icon: TrendingUp,
                        label: "Largest category",
                        value: largestCategory.name !== "—" ? largestCategory.name : "—",
                        sub: largestCategory.file_count ? `${largestCategory.file_count} images · ${formatBytes(largestCategory.size)}` : "",
                        color: "text-emerald-400",
                    },
                ].map((s, i) => (
                    <motion.div
                        key={s.label}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: i * 0.06 }}
                    >
                        <Card className="hover:shadow-lg transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                                <s.icon className={`h-4 w-4 ${s.color}`} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold truncate">{s.value}</div>
                                {s.sub && <p className="text-xs text-muted-foreground mt-1 truncate">{s.sub}</p>}
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Images per category bar chart */}
                <motion.div
                    className="lg:col-span-2"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                >
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="text-base">Images per Category</CardTitle>
                            <CardDescription>Top {topByCount.length} by image count</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={topByCount} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fontSize: 11 }}
                                        tickFormatter={(v) => v.length > 10 ? v.slice(0, 10) + "…" : v}
                                    />
                                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                    <Tooltip content={<CustomBarTooltip />} />
                                    <Bar dataKey="file_count" name="images" radius={[4, 4, 0, 0]}>
                                        {topByCount.map((_, i) => (
                                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Storage pie chart */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.28 }}
                >
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="text-base">Storage Distribution</CardTitle>
                            <CardDescription>Top {topBySize.length} by disk usage</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center">
                            {topBySize.length > 0 ? (
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie
                                            data={topBySize}
                                            dataKey="size"
                                            nameKey="name"
                                            cx="50%"
                                            cy="45%"
                                            outerRadius={70}
                                            innerRadius={36}
                                        >
                                            {topBySize.map((_, i) => (
                                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomPieTooltip />} />
                                        <Legend
                                            iconType="circle"
                                            iconSize={8}
                                            formatter={(v) => (
                                                <span className="text-xs text-muted-foreground">
                                                    {v.length > 12 ? v.slice(0, 12) + "…" : v}
                                                </span>
                                            )}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-muted-foreground text-sm">No data</p>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Size per category bar chart */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.34 }}
            >
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Storage per Category</CardTitle>
                        <CardDescription>Top {topBySize.length} by disk usage — hover for exact size</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={topBySize} layout="vertical" margin={{ top: 0, right: 48, left: 8, bottom: 0 }}>
                                <XAxis
                                    type="number"
                                    tick={{ fontSize: 11 }}
                                    tickFormatter={(v) => formatBytes(v, 0)}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={90}
                                    tick={{ fontSize: 11 }}
                                    tickFormatter={(v) => v.length > 12 ? v.slice(0, 12) + "…" : v}
                                />
                                <Tooltip content={<CustomBarTooltip />} />
                                <Bar dataKey="size" name="size" radius={[0, 4, 4, 0]}>
                                    {topBySize.map((_, i) => (
                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Category grid */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
            >
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base">All Categories</CardTitle>
                            <CardDescription>{categories.length} total</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => router("/category")}>
                            <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                            New
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {categories.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <FolderOpen className="h-12 w-12 mb-3 opacity-40" />
                                <p>No categories yet</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
                                {categories.map((category) => {
                                    const pct = stats.storage_used
                                        ? Math.round((category.size / stats.storage_used) * 100)
                                        : 0
                                    return (
                                        <motion.button
                                            key={category.name}
                                            whileHover={{ y: -3 }}
                                            transition={{ duration: 0.15 }}
                                            onClick={() => handleCategoryClick(category.name)}
                                            className="group rounded-xl overflow-hidden border bg-card hover:border-primary/50 hover:shadow-lg transition-all text-left"
                                        >
                                            <div className="relative h-24 overflow-hidden">
                                                <CategoryThumbnail category={category} />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                                <div className="absolute bottom-2 right-2">
                                                    <span className="text-[10px] bg-black/40 text-white rounded px-1.5 py-0.5 backdrop-blur-sm">
                                                        {pct}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-2.5">
                                                <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">
                                                    {category.name}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                    {category.file_count} · {formatBytes(category.size)}
                                                </p>
                                            </div>
                                            <div className="px-2.5 pb-2.5">
                                                <div className="h-1 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary rounded-full transition-all"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </motion.button>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Bottom: quick navigate */}
            <motion.div
                className="flex gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.46 }}
            >
                <Button variant="outline" className="flex-1" onClick={() => router("/locker")}>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Browse Images
                    <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => router("/category")}>
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Manage Categories
                    <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
            </motion.div>
        </div>
    )
}
