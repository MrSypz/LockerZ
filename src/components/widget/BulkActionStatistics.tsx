
import type { File } from "@/types/file"
import { formatBytes } from "@/components/widget/Dashboard"
import { HardDrive, Image } from "lucide-react"

interface BulkActionStatisticsProps {
  files: File[]
}

export function BulkActionStatistics({ files }: BulkActionStatisticsProps) {
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  const categories = [...new Set(files.map((file) => file.category))]

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Images:</span>
        </div>
        <span className="text-sm text-muted-foreground">{files.length}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Total Size:</span>
        </div>
        <span className="text-sm text-muted-foreground">{formatBytes(totalSize)}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Categories:</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {categories.length === 1 ? categories[0] : `${categories.length} categories`}
        </span>
      </div>
    </div>
  )
}

