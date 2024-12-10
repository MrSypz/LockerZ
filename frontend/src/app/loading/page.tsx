'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Progress } from "@/components/ui/progress"
import { RotatingTips } from "@/components/Rotating-tips"
import {invoke} from "@tauri-apps/api/core";

export default function DarkSplashScreen() {
    const [progress, setProgress] = useState(0)

    async function executeSidecar() {
        if (typeof window === 'undefined') {
            console.log('Sidecar commands can only be invoked on the client side.');
            return;
        }

        try {
            const result = await invoke('run_sidecar');
            console.log('Sidecar Output:', result);
        } catch (error) {
            console.error('Error executing sidecar:', error);
        }
    }

    // listen('sidecar-output', (event) => {
    //     console.log('Received sidecar output:', event.payload)
    //     // Handle the sidecar output here (e.g., update UI, process data, etc.)
    // })
    useEffect(() => {
        executeSidecar();

        const timer = setInterval(() => {
            setProgress((oldProgress) => {
                if (oldProgress === 100) {
                    clearInterval(timer)
                    return 100
                }
                const newProgress = oldProgress + 1
                return Math.min(newProgress, 100)
            })
        }, 50)

        return () => clearInterval(timer)
    }, [])

    return (
        <div
            className="w-full h-full flex items-center justify-center rounded-xl overflow-hidden backdrop-blur-md"
            style={{
                backgroundColor: 'rgba(37,37,37,0.7)',
            }}
        >
            <div className="w-full max-w-[340px] p-6 space-y-4">
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-2xl font-bold text-white text-center">LockerZ</h1>
                </motion.div>
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                >
                    <p className="text-sm text-white text-center">It's doing something, don't worry!</p>
                </motion.div>
                <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                >
                    <Progress
                        value={progress}
                        className="h-1 bg-white/20"
                    />
                </motion.div>
                <div className="flex justify-between items-center text-white text-xs">
                    <span>Loading assets</span>
                    <span className="font-semibold">{progress}%</span>
                </div>
                <RotatingTips />
            </div>
        </div>
    )
}

