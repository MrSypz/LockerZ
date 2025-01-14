"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { listen } from "@tauri-apps/api/event"
import { motion, AnimatePresence } from "framer-motion"
import { Check, X, Loader2, FileIcon } from 'lucide-react'
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ProgressInfo {
    filename: string
    progress: number
    status: string
}

interface UploadProgressMap {
    [key: string]: ProgressInfo & {
        removeTimeout?: NodeJS.Timeout
    }
}

const UploadProgress: React.FC = () => {
    const [uploads, setUploads] = useState<UploadProgressMap>({})
    const [isVisible, setIsVisible] = useState(false)

    const removeUpload = useCallback((filename: string) => {
        setUploads(prev => {
            const newState = { ...prev }
            delete newState[filename]
            return newState
        })
    }, [])

    useEffect(() => {
        const unlisten: Array<(() => void)> = []

        const setupListeners = async () => {
            const startUnlisten = await listen<ProgressInfo>('upload-started', (event) => {
                setUploads(prev => ({
                    ...prev,
                    [event.payload.filename]: event.payload
                }))
                setIsVisible(true)
            })
            unlisten.push(startUnlisten)

            const progressUnlisten = await listen<ProgressInfo>('upload-progress', (event) => {
                setUploads(prev => ({
                    ...prev,
                    [event.payload.filename]: event.payload
                }))
            })
            unlisten.push(progressUnlisten)

            const finishUnlisten = await listen<ProgressInfo>('upload-finished', (event) => {
                setUploads(prev => {
                    const newState = { ...prev }
                    newState[event.payload.filename] = event.payload
                    const removeTimeout = setTimeout(() => removeUpload(event.payload.filename), 3000)
                    newState[event.payload.filename].removeTimeout = removeTimeout
                    return newState
                })
            })
            unlisten.push(finishUnlisten)
        }

        setupListeners().catch(console.error)

        return () => {
            Object.values(uploads).forEach(upload => {
                if (upload.removeTimeout) {
                    clearTimeout(upload.removeTimeout)
                }
            })
            unlisten.forEach(unlistenFn => unlistenFn())
        }
    }, [removeUpload])

    useEffect(() => {
        if (Object.keys(uploads).length === 0 && isVisible) {
            const timeout = setTimeout(() => setIsVisible(false), 500)
            return () => clearTimeout(timeout)
        }
    }, [uploads, isVisible])

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed bottom-24 right-4 z-50"
                >
                    <Card className="w-96 shadow-lg overflow-hidden">
                        <CardContent className="p-4">
                            <h3 className="text-lg font-semibold mb-4">Upload Progress</h3>
                            <ScrollArea className="h-64 pr-4">
                                <AnimatePresence>
                                    {Object.entries(uploads).map(([filename, info]) => (
                                        <UploadItem key={filename} filename={filename} info={info} />
                                    ))}
                                </AnimatePresence>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

const UploadItem: React.FC<{ filename: string; info: ProgressInfo }> = ({ filename, info }) => {
    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-4 overflow-hidden"
        >
            <div className="flex items-center space-x-3 mb-2">
                <FileIcon className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium truncate flex-1" title={filename}>
                    {filename}
                </span>
                <StatusIcon status={info.status} />
            </div>
            <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                    <div>
                        <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                            {info.status}
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-semibold inline-block text-blue-600">
                            {Math.round(info.progress)}%
                        </span>
                    </div>
                </div>
                <Progress
                    value={Math.min(info.progress, 100)}
                    className="w-full h-2 transition-all duration-300"
                />
            </div>
        </motion.div>
    )
}

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
    switch (status.toLowerCase()) {
        case 'complete':
        case 'completed':
            return <Check className="w-5 h-5 text-green-500" />
        case 'error':
            return <X className="w-5 h-5 text-red-500" />
        default:
            return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
    }
}

export default UploadProgress