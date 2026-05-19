
import { useState, useEffect } from "react"
import { listen } from "@tauri-apps/api/event"
import { motion, AnimatePresence } from "framer-motion"
import { Terminal, Hash, GitCompare, Loader2, Image, CheckCircle2, X, Clock } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface ProgressInfo {
    filename: string
    progress: number
    status: string
    phase: string
    current_file?: string
    target_file?: string
    processed_files: number
    total_files: number
    estimated_time_remaining?: string
    elapsed_time?: string
}

const DuplicateProgress = () => {
    const [isVisible, setIsVisible] = useState(false)
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [progressInfo, setProgressInfo] = useState<ProgressInfo>({
        filename: "",
        progress: 0,
        status: "",
        phase: "",
        current_file: "",
        target_file: "",
        processed_files: 0,
        total_files: 0,
    })

    useEffect(() => {
        const unlisten: Array<() => void> = []

        const setupListeners = async () => {
            const startUnlisten = await listen<ProgressInfo>("dupe-check-started", (event) => {
                setProgressInfo(event.payload)
                setIsVisible(true)
                setIsCollapsed(false)
            })
            unlisten.push(startUnlisten)

            const progressUnlisten = await listen<ProgressInfo>("dupe-check-progress", (event) => {
                setProgressInfo(event.payload)
            })
            unlisten.push(progressUnlisten)

            const finishUnlisten = await listen<ProgressInfo>("dupe-check-finished", (event) => {
                setProgressInfo({ ...event.payload, status: "complete" })
                setTimeout(() => setIsVisible(false), 3000)
            })
            unlisten.push(finishUnlisten)
        }

        setupListeners()

        return () => {
            unlisten.forEach((fn) => fn())
        }
    }, [])

    const getPhaseIcon = () => {
        switch (progressInfo.phase?.toLowerCase()) {
            case "computing image hashes":
            case "hashing":
                return <Hash className="w-4 h-4" />
            case "comparing images":
            case "comparing":
                return <GitCompare className="w-4 h-4" />
            case "collecting images":
            case "scanning":
                return <Image className="w-4 h-4" />
            case "complete":
            case "finished":
                return <CheckCircle2 className="w-4 h-4 text-green-500" />
            case "finalizing results":
            case "finalizing":
                return <Loader2 className="w-4 h-4 animate-spin" />
            default:
                return <Terminal className="w-4 h-4" />
        }
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="fixed bottom-4 right-4 z-50 w-96"
                >
                    <Card className="border-2 shadow-lg overflow-hidden">
                        <CardContent className="p-0">
                            {/* Header */}
                            <div className="flex items-center justify-between bg-muted/60 px-4 py-3">
                                <div className="flex items-center space-x-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                    <Terminal className="h-3 w-3" />
                  </span>
                                    <span className="font-medium">Duplicate Check {isCollapsed ? "Running..." : "Progress"}</span>
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 rounded-full"
                                        onClick={() => setIsCollapsed(!isCollapsed)}
                                    >
                                        {isCollapsed ? <Image className="h-3.5 w-3.5" /> : <Terminal className="h-3.5 w-3.5" />}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 rounded-full"
                                        onClick={() => setIsVisible(false)}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>

                            {/* Progress content */}
                            <AnimatePresence>
                                {!isCollapsed && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="px-4 py-3 space-y-4"
                                    >
                                        {/* Progress Bar */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <Badge
                                                    variant={progressInfo.status === "complete" ? "outline" : "secondary"}
                                                    className="px-2 py-0"
                                                >
                                                    {progressInfo.status === "complete" ? "Complete" : progressInfo.phase || "Initializing..."}
                                                </Badge>
                                                <span className="font-mono">{Math.round(progressInfo.progress)}%</span>
                                            </div>
                                            <Progress value={progressInfo.progress} className="h-2" />
                                        </div>

                                        {/* Time information */}
                                        {(progressInfo.elapsed_time || progressInfo.estimated_time_remaining) && (
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                {progressInfo.elapsed_time && (
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        <span>Elapsed: {progressInfo.elapsed_time}</span>
                                                    </div>
                                                )}
                                                {progressInfo.estimated_time_remaining && progressInfo.status !== "complete" && (
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        <span>Remaining: {progressInfo.estimated_time_remaining}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* File counters */}
                                        {progressInfo.processed_files > 0 && progressInfo.total_files > 0 && (
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>Files processed: {progressInfo.processed_files.toLocaleString()}</span>
                                                <span>Total files: {progressInfo.total_files.toLocaleString()}</span>
                                            </div>
                                        )}

                                        {/* Current Operation */}
                                        <div className="space-y-2 text-xs">
                                            <div className="flex items-center space-x-2">
                                                {getPhaseIcon()}
                                                <span className="font-medium">{progressInfo.phase}</span>
                                            </div>

                                            {progressInfo.current_file && (
                                                <div className="pl-6 space-y-1">
                                                    <div className="truncate text-muted-foreground" title={progressInfo.current_file}>
                                                        {progressInfo.current_file.split("/").pop()}
                                                    </div>
                                                    {progressInfo.target_file && (
                                                        <div className="truncate text-muted-foreground" title={progressInfo.target_file}>
                                                            ↳ {progressInfo.target_file.split("/").pop()}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default DuplicateProgress

