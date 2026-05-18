import { FolderOpen, ImageIcon, HardDrive, LayoutGrid, Grid, Search, PlusCircle, ChevronRight, X } from "lucide-react"
import { useState } from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Category {
  name: string
  file_count: number
  size: number
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

const PLACEHOLDER_CATEGORIES: Category[] = []

const stats = [
  { icon: ImageIcon,  label: "Total Images",  value: "0" },
  { icon: FolderOpen, label: "Categories",    value: "0" },
  { icon: HardDrive,  label: "Storage Used",  value: "0 Bytes" },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  const filtered = PLACEHOLDER_CATEGORIES.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="container mx-auto p-6 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold gradient-text-header mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Manage your image library</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
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

      {/* Categories */}
      <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-background via-background to-muted/30">
        <CardHeader className="pb-2 pt-6 px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">Categories</CardTitle>
              <CardDescription className="mt-1">Browse and manage your image categories</CardDescription>
            </div>
            <div className="flex flex-col md:flex-row gap-3">
              <div className={`relative transition-all duration-300 ${isSearchFocused ? "w-full md:w-80" : "w-full md:w-64"}`}>
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${isSearchFocused ? "text-primary" : "text-muted-foreground"}`} />
                {searchTerm && (
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => setSearchTerm("")}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
                <Input
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  className="pl-9 pr-7"
                />
              </div>
              <div className="flex items-center gap-3">
                <Button size="sm" className="gap-1" onClick={() => navigate("/category")}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  New Category
                </Button>
                <div className="hidden md:flex items-center gap-1 bg-muted/80 rounded-lg p-1">
                  <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("grid")} className="h-8 w-8 p-0 rounded-md">
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("list")} className="h-8 w-8 p-0 rounded-md">
                    <Grid className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[480px] overflow-y-auto pr-2">
            {filtered.length > 0 ? (
              <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5" : "space-y-4"}>
                {filtered.map((category) => (
                  <motion.div key={category.name} whileHover={{ y: -5, transition: { duration: 0.2 } }} className="h-full">
                    <Card className="overflow-hidden h-full border shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group">
                      <div className="w-full h-36 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/20 flex items-center justify-center">
                        <FolderOpen className="h-16 w-16 text-primary/70" />
                      </div>
                      <CardContent className="p-5 flex-grow relative">
                        <div className="absolute -top-6 right-4">
                          <div className="bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-full shadow-md">
                            {category.file_count} images
                          </div>
                        </div>
                        <h3 className="font-semibold text-lg mt-2 line-clamp-1">{category.name}</h3>
                        <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
                          <HardDrive className="h-3.5 w-3.5" />
                          <span>{formatBytes(category.size)}</span>
                        </div>
                      </CardContent>
                      <CardFooter className="p-5 pt-0">
                        <Button variant="outline" className="w-full group relative overflow-hidden" onClick={() => navigate("/locker")}>
                          <span className="relative z-10 group-hover:text-primary-foreground transition-colors duration-300">Browse</span>
                          <ChevronRight className="ml-2 h-4 w-4 relative z-10 transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary-foreground" />
                          <span className="absolute inset-0 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-muted/80 to-muted flex items-center justify-center mb-5 shadow-inner">
                  <FolderOpen className="h-10 w-10 text-muted-foreground/70" />
                </div>
                <h3 className="text-xl font-medium mb-2">No categories found</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  {searchTerm ? `No results matching "${searchTerm}"` : "Create your first category to start organizing your images."}
                </p>
                {!searchTerm && (
                  <Button onClick={() => navigate("/category")}>
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
