import { useState } from "react"
import { Upload, ImageIcon, FolderOpen, ChevronLeft, ChevronRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const CATEGORIES = ["all"]
const IMAGES_PER_PAGE_OPTIONS = [10, 20, 50, 100]

export default function LockerPage() {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [imagesPerPage, setImagesPerPage] = useState(20)
  const totalPages = 1

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b bg-background/50 backdrop-blur-sm shrink-0">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c === "all" ? "All Categories" : c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <Select value={String(imagesPerPage)} onValueChange={(v) => setImagesPerPage(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IMAGES_PER_PAGE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="gap-1.5">
            <Upload className="h-4 w-4" />
            Import
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedCategory}-${currentPage}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center justify-center h-full gap-4 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <ImageIcon className="h-10 w-10 text-muted-foreground/70" />
            </div>
            <div>
              <h3 className="text-xl font-medium mb-1">No images yet</h3>
              <p className="text-sm text-muted-foreground">Import images or set a root folder in Settings.</p>
            </div>
            <Button variant="outline" className="gap-1.5">
              <FolderOpen className="h-4 w-4" />
              Open Settings
            </Button>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-3 border-t bg-background/50 backdrop-blur-sm shrink-0">
        <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
