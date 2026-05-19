import { useEffect, useState, useCallback } from "react"
import {
    FolderOpen,
    ImageIcon,
    HardDrive,
    ChevronRight,
    PlusCircle,
    TrendingUp,
    EyeOff,
    Upload,
    Download,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    type ChartConfig,
} from "@/components/ui/chart.tsx"
import { useTranslation } from "react-i18next"
import { invoke, convertFileSrc } from "@tauri-apps/api/core"
import { save, open as openDialog } from "@tauri-apps/plugin-dialog"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { type CategoryIcon, DatabaseService } from "@/hooks/use-database"
import { useSharedSettings } from "@/utils/SettingsContext"
import { useToast } from "@/hooks/use-toast"
import ExportProgressDialog from "@/components/dialog/ExportProgressDialog"
import ImportProgressDialog, { type ImportResult } from "@/components/dialog/ImportProgressDialog"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    PieChart,
    Pie,
    CartesianGrid,
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

// CSS variable slots used by ChartContainer — maps to --chart-1 … --chart-8
const CHART_VAR_COLORS = [
    "var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)",
    "var(--chart-5)", "var(--chart-6)", "var(--chart-7)", "var(--chart-8)",
]

/** Build a ChartConfig from a list of category names, keyed by name. */
function buildChartConfig(names: string[]): ChartConfig {
    const config: ChartConfig = {}
    names.forEach((name, i) => {
        config[name] = {
            label: name,
            color: CHART_VAR_COLORS[i % CHART_VAR_COLORS.length],
        }
    })
    return config
}

// ── Category thumbnail with Skeleton fallback ────────────────────────────────

function CategoryThumbnail({ category }: { category: Category }) {
    const [icon, setIcon] = useState<CategoryIcon | null>(null)
    const [loading, setLoading] = useState(true)
    const db = new DatabaseService()

    useEffect(() => {
        db.getCategoryIcon(category.name)
            .then(setIcon)
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [category.name])

    // if (loading) {
    //     return <Skeleton className="w-full h-full rounded-none" />
    // }

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

// ── Stat card data ───────────────────────────────────────────────────────────

interface StatCardProps {
    icon: React.ElementType
    label: string
    value: string
    sub?: string
    color: string
    delay: number
}

function StatCard({ icon: Icon, label, value, sub, color, delay }: StatCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
        >
            <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                    <Icon className={`h-4 w-4 ${color}`} />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold truncate">{value}</div>
                    {sub && <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>}
                </CardContent>
            </Card>
        </motion.div>
    )
}

// ── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
    const { t } = useTranslation()
    const [categories, setCategories] = useState<Category[]>([])
    const [stats, setStats] = useState<Stats>({ total_images: 0, categories: 0, storage_used: 0 })
    const router = useNavigate()
    const { settings } = useSharedSettings()
    const sensitiveTags: string[] = settings?.sensitive_tags ?? []
    const { toast } = useToast()

    const [exportDialog, setExportDialog] = useState<{ categoryName: string; outputPath: string } | null>(null)
    const [importDialog, setImportDialog] = useState<{ packPath: string } | null>(null)

    const handleExport = useCallback(async (categoryName: string) => {
        const outPath = await save({
            defaultPath: `${categoryName}.lkrz`,
            filters: [{ name: "LockerZ Pack", extensions: ["lkrz"] }],
        })
        if (!outPath) return
        setExportDialog({ categoryName, outputPath: outPath })
    }, [])

    const handleImport = async () => {
        const filePath = await openDialog({
            multiple: false,
            filters: [{ name: "LockerZ Pack", extensions: ["lkrz"] }],
        })
        if (!filePath) return
        setImportDialog({ packPath: filePath as string })
    }

    const handleImportDone = useCallback(async (result: ImportResult) => {
        toast({
            title: t("settings.pack.importSuccess", { name: result.category_name, count: result.image_count }),
            description: result.was_renamed ? t("settings.pack.importRenamed") : `by ${result.owner || "unknown"}`,
        })
        const [cats, s] = await Promise.all([invoke<Category[]>("get_categories"), invoke<Stats>("get_stats")])
        setCategories(cats)
        setStats(s)
    }, [t, toast])

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

    const maskName = (name: string) => sensitiveTags.includes(name) ? "Sensitive" : name

    const topByCount = [...categories]
        .sort((a, b) => b.file_count - a.file_count)
        .slice(0, 8)
        .map((c, i) => ({ ...c, name: maskName(c.name), fill: CHART_VAR_COLORS[i % CHART_VAR_COLORS.length] }))

    const topBySize = [...categories]
        .sort((a, b) => b.size - a.size)
        .slice(0, 6)
        .map((c, i) => ({ ...c, name: maskName(c.name), fill: CHART_VAR_COLORS[i % CHART_VAR_COLORS.length] }))

    const countChartConfig = buildChartConfig(topByCount.map((c) => c.name))
    const sizeChartConfig  = buildChartConfig(topBySize.map((c) => c.name))

    const avgImagesPerCategory = categories.length
        ? Math.round(stats.total_images / categories.length)
        : 0

    const largestCategory = categories.reduce(
        (acc, c) => (c.file_count > acc.file_count ? c : acc),
        { name: "—", file_count: 0, size: 0 }
    )

    const statCards: StatCardProps[] = [
        {
            icon: ImageIcon,
            label: t("dashboard.content.totalimg"),
            value: stats.total_images.toLocaleString(),
            sub: `avg ${avgImagesPerCategory} per category`,
            color: "text-indigo-400",
            delay: 0.06,
        },
        {
            icon: FolderOpen,
            label: t("dashboard.content.category"),
            value: stats.categories.toLocaleString(),
            sub: largestCategory.name !== "—" ? `largest: ${maskName(largestCategory.name)}` : "no categories yet",
            color: "text-violet-400",
            delay: 0.12,
        },
        {
            icon: HardDrive,
            label: t("dashboard.content.storageused"),
            value: formatBytes(stats.storage_used),
            sub: categories.length
                ? `avg ${formatBytes(stats.storage_used / categories.length)} per category`
                : "",
            color: "text-sky-400",
            delay: 0.18,
        },
        {
            icon: TrendingUp,
            label: "Largest category",
            value: largestCategory.name !== "—" ? maskName(largestCategory.name) : "—",
            sub: largestCategory.file_count
                ? `${largestCategory.file_count} images · ${formatBytes(largestCategory.size)}`
                : "",
            color: "text-emerald-400",
            delay: 0.24,
        },
    ]

    return (
        <>
        <TooltipProvider>
            <div className="container mx-auto p-6 space-y-6">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <h1 className="text-4xl font-bold gradient-text-header mb-1">
                        {t("dashboard.header")}
                    </h1>
                    <p className="text-muted-foreground">{t("dashboard.subheader")}</p>
                </motion.div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {statCards.map((s) => (
                        <StatCard key={s.label} {...s} />
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
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-base">Images per Category</CardTitle>
                                    <Badge variant="secondary">Top {topByCount.length}</Badge>
                                </div>
                                <CardDescription>Sorted by image count</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={countChartConfig} className="h-[220px] w-full">
                                    <BarChart
                                        data={topByCount}
                                        margin={{ top: 0, right: 8, left: -16, bottom: 0 }}
                                    >
                                        <CartesianGrid vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                            tick={{ fontSize: 11 }}
                                            tickFormatter={(v) => v.length > 10 ? v.slice(0, 10) + "…" : v}
                                        />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fontSize: 11 }}
                                            allowDecimals={false}
                                        />
                                        <ChartTooltip
                                            cursor={false}
                                            content={<ChartTooltipContent hideLabel />}
                                        />
                                        <Bar
                                            dataKey="file_count"
                                            name="Images"
                                            fill="var(--chart-1)"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ChartContainer>
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
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-base">Storage Distribution</CardTitle>
                                    <Badge variant="secondary">Top {topBySize.length}</Badge>
                                </div>
                                <CardDescription>By disk usage</CardDescription>
                            </CardHeader>
                            <CardContent className="flex items-center justify-center">
                                {topBySize.length > 0 ? (
                                    <ChartContainer
                                        config={sizeChartConfig}
                                        className="mx-auto aspect-square max-h-[220px]"
                                    >
                                        <PieChart>
                                            <ChartTooltip
                                                cursor={false}
                                                content={<ChartTooltipContent hideLabel />}
                                            />
                                            <Pie
                                                data={topBySize}
                                                dataKey="size"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={80}
                                                innerRadius={40}
                                                stroke="0"
                                            />
                                            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                                        </PieChart>
                                    </ChartContainer>
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
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-base">Storage per Category</CardTitle>
                                <Badge variant="secondary">Top {topBySize.length}</Badge>
                            </div>
                            <CardDescription>Hover for exact size</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={sizeChartConfig} className="h-[180px] w-full">
                                <BarChart
                                    data={topBySize}
                                    layout="vertical"
                                    margin={{ top: 0, right: 48, left: 8, bottom: 0 }}
                                >
                                    <CartesianGrid horizontal={false} />
                                    <XAxis
                                        type="number"
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fontSize: 11 }}
                                        tickFormatter={(v) => formatBytes(v, 0)}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={90}
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fontSize: 11 }}
                                        tickFormatter={(v) => v.length > 12 ? v.slice(0, 12) + "…" : v}
                                    />
                                    <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent hideLabel />}
                                    />
                                    <Bar
                                        dataKey="size"
                                        name="Size"
                                        fill="var(--chart-1)"
                                        radius={[0, 4, 4, 0]}
                                    />
                                </BarChart>
                            </ChartContainer>
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
                                <CardDescription>
                                    <Badge variant="outline" className="mt-1">
                                        {categories.length} total
                                    </Badge>
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" onClick={handleImport}>
                                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                                    {t("settings.pack.import")}
                                </Button>
                                <Button size="sm" onClick={() => router("/category")}>
                                    <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                                    New
                                </Button>
                            </div>
                        </CardHeader>

                        <Separator />

                        <CardContent className="pt-4">
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
                                        const isSensitive = sensitiveTags.includes(category.name)
                                        return (
                                            <Tooltip key={category.name}>
                                                <TooltipTrigger asChild>
                                                    <motion.button
                                                        whileHover={{ y: -3 }}
                                                        transition={{ duration: 0.15 }}
                                                        onClick={() => handleCategoryClick(category.name)}
                                                        className="group rounded-xl overflow-hidden border bg-card hover:border-primary/50 hover:shadow-lg transition-all text-left"
                                                    >
                                                        <div className="relative h-24 overflow-hidden">
                                                            <CategoryThumbnail category={category} />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                                            {isSensitive && (
                                                                <div
                                                                    className="absolute inset-0 flex flex-col items-center justify-center gap-1"
                                                                    style={{ backdropFilter: "blur(14px)", background: "rgba(0,0,0,0.5)" }}
                                                                >
                                                                    <EyeOff className="h-5 w-5 text-white/70" />
                                                                    <span className="text-[9px] font-semibold text-white/60 uppercase tracking-widest">Sensitive</span>
                                                                </div>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); handleExport(category.name) }}
                                                                className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 rounded-md p-1"
                                                                title={t("settings.pack.export")}
                                                            >
                                                                <Download className="h-3.5 w-3.5 text-white" />
                                                            </button>
                                                            <div className="absolute bottom-2 right-2">
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="text-[10px] bg-black/40 text-white border-0 backdrop-blur-sm px-1.5 py-0.5 h-auto"
                                                                >
                                                                    {pct}%
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                        <div className="p-2.5">
                                                            <p className={`text-xs font-semibold truncate transition-colors ${isSensitive ? "text-amber-400/70 italic" : "group-hover:text-primary"}`}>
                                                                {isSensitive ? (
                                                                    <span className="flex items-center gap-1">
                                                                        <EyeOff className="h-3 w-3 shrink-0" />
                                                                        Sensitive
                                                                    </span>
                                                                ) : category.name}
                                                            </p>
                                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                                                {isSensitive ? "—" : `${category.file_count} · ${formatBytes(category.size)}`}
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
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom">
                                                    {isSensitive ? (
                                                        <p className="text-amber-400 font-medium flex items-center gap-1.5">
                                                            <EyeOff className="h-3.5 w-3.5" /> Sensitive content hidden
                                                        </p>
                                                    ) : (
                                                        <>
                                                            <p className="font-medium">{category.name}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {category.file_count} images · {formatBytes(category.size)} · {pct}% of storage
                                                            </p>
                                                        </>
                                                    )}
                                                </TooltipContent>
                                            </Tooltip>
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
        </TooltipProvider>

        {exportDialog && (
            <ExportProgressDialog
                categoryName={exportDialog.categoryName}
                outputPath={exportDialog.outputPath}
                onClose={() => setExportDialog(null)}
            />
        )}
        {importDialog && (
            <ImportProgressDialog
                packPath={importDialog.packPath}
                onDone={handleImportDone}
                onClose={() => setImportDialog(null)}
            />
        )}
        </>
    )
}