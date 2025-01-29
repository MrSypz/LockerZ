import React, { useState, useEffect } from 'react';
import { listen } from "@tauri-apps/api/event";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Hash, GitCompare, Loader2 } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";

interface ProgressInfo {
    filename: string;
    progress: number;
    status: string;
    phase?: string;
    currentFile?: string;
    targetFile?: string;
}

const DuplicateProgress = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [progressInfo, setProgressInfo] = useState<ProgressInfo>({
        filename: '',
        progress: 0,
        status: '',
        phase: '',
        currentFile: '',
        targetFile: ''
    });

    useEffect(() => {
        const unlisten: Array<(() => void)> = [];

        const setupListeners = async () => {
            const startUnlisten = await listen<ProgressInfo>('dupe-check-started', (event) => {
                setProgressInfo(event.payload);
                setIsVisible(true);
            });
            unlisten.push(startUnlisten);

            const progressUnlisten = await listen<ProgressInfo>('dupe-check-progress', (event) => {
                setProgressInfo(event.payload);
            });
            unlisten.push(progressUnlisten);

            const finishUnlisten = await listen<ProgressInfo>('dupe-check-finished', (event) => {
                setProgressInfo(event.payload);
                setTimeout(() => setIsVisible(false), 2000);
            });
            unlisten.push(finishUnlisten);
        };

        setupListeners();

        return () => {
            unlisten.forEach(fn => fn());
        };
    }, []);

    const getPhaseIcon = () => {
        switch (progressInfo.phase?.toLowerCase()) {
            case 'hashing':
                return <Hash className="w-4 h-4" />;
            case 'comparing':
                return <GitCompare className="w-4 h-4" />;
            default:
                return <Terminal className="w-4 h-4" />;
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="fixed bottom-4 left-4 z-50 w-96"
                >
                    <Card className="border-2 border-muted">
                        <CardContent className="p-4">
                            <div className="space-y-4">
                                {/* Header */}
                                <div className="flex items-center space-x-2 text-sm">
                                    <Terminal className="w-4 h-4" />
                                    <span className="font-mono">Duplicate Check Progress</span>
                                    {progressInfo.status === 'processing' && (
                                        <Loader2 className="w-4 h-4 animate-spin ml-auto" />
                                    )}
                                </div>

                                {/* Progress Bar */}
                                <div className="space-y-1">
                                    <Progress value={progressInfo.progress} className="h-2" />
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>{progressInfo.phase || 'Initializing...'}</span>
                                        <span className="font-mono">{Math.round(progressInfo.progress)}%</span>
                                    </div>
                                </div>

                                {/* Current Operation */}
                                <div className="space-y-2 text-xs">
                                    <div className="flex items-center space-x-2">
                                        {getPhaseIcon()}
                                        <span className="font-mono">{progressInfo.phase}</span>
                                    </div>

                                    {progressInfo.currentFile && (
                                        <div className="pl-6 space-y-1 font-mono">
                                            <div className="truncate" title={progressInfo.currentFile}>
                                                → {progressInfo.currentFile}
                                            </div>
                                            {progressInfo.targetFile && (
                                                <div className="truncate text-muted-foreground" title={progressInfo.targetFile}>
                                                    ↳ {progressInfo.targetFile}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DuplicateProgress;