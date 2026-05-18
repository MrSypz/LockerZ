import { useState } from "react"
import { ImageIcon, SlidersHorizontal, Loader2, ChevronDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const RESOLUTIONS = ["720p", "1080p", "2k", "4k"]

export default function DupeCheckerPage() {
  const [threshold, setThreshold] = useState(10)
  const [resolution, setResolution] = useState("1080p")
  const [isScanning, setIsScanning] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold gradient-text-header">Dupe Checker</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setSettingsOpen((o) => !o)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Settings
              <ChevronDown className={`h-4 w-4 transition-transform ${settingsOpen ? "rotate-180" : ""}`} />
            </Button>
            <Button size="sm" onClick={() => setIsScanning((s) => !s)} disabled={isScanning}>
              {isScanning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Start Scan
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {settingsOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Similarity Threshold</span>
                      <Badge variant="secondary">{threshold}</Badge>
                    </div>
                    <Slider min={1} max={20} step={1} value={[threshold]} onValueChange={([v]) => setThreshold(v)} />
                    <p className="text-xs text-muted-foreground">Lower = stricter matching (fewer false positives)</p>
                  </div>
                  <div className="space-y-3">
                    <span className="text-sm font-medium">Comparison Resolution</span>
                    <Select value={resolution} onValueChange={setResolution}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RESOLUTIONS.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Higher resolution is more accurate but slower</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center justify-center py-24 text-center gap-6"
        >
          <div className="rounded-full bg-muted/50 p-8">
            <ImageIcon className="h-16 w-16 text-muted-foreground" />
          </div>
          <div className="space-y-2 max-w-md">
            <h3 className="text-2xl font-semibold">Find Duplicate Images</h3>
            <p className="text-muted-foreground">
              Scan your library to find and manage duplicate or similar images. Adjust settings above before scanning.
            </p>
          </div>
          <Button size="lg" onClick={() => setIsScanning(true)}>
            <ImageIcon className="mr-2 h-4 w-4" />
            Start Scanning
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
