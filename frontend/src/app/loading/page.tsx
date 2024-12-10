'use client'

import React, {useState, useEffect} from 'react'
import {motion} from 'framer-motion'
import {Progress} from "@/components/ui/progress"
import {RotatingTips} from "@/components/Rotating-tips"
import {readTextFileLines, BaseDirectory, exists} from '@tauri-apps/plugin-fs';
import {path} from "@tauri-apps/api";
import {invoke} from "@tauri-apps/api/core";

export default function DarkSplashScreen() {
    const [progress, setProgress] = useState(0)
    const [currentPreMessage, setCurrentPreMessage] = useState('')
    const [error, setError] = useState<string | null>(null)

    const wrapText = (text: string, maxLength: number = 30) => {
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength) + '...';
    };

    function sleep(seconds: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, seconds * 1000));
    }

    useEffect(() => {
        const fetchPreMessages = async () => {
            try {
                const filePath = await path.join(await path.appDataDir(), 'logs', 'latest.log');

                const fileExists = await exists(filePath, {baseDir: BaseDirectory.AppData});
                if (!fileExists) {
                    console.error(`Log file not found at: ${filePath}`);
                    return;
                }

                const lines = await await readTextFileLines(filePath, {baseDir: BaseDirectory.AppData});
                const filteredMessages = [];
                for await (const line of lines) {
                    if (line.startsWith('[PRE]')) {
                        // Extract content after `[PRE] <timestamp>: `
                        const content = line.split(': ').slice(1).join(': ').trim();
                        filteredMessages.push(content);
                    }
                }

                for (let i = 0; i < filteredMessages.length; i++) {
                    setCurrentPreMessage(filteredMessages[i]);
                    setProgress(Math.round(((i + 1) / filteredMessages.length) * 100));
                    await sleep(0.3); // Add a small delay between updates
                }

                setCurrentPreMessage('Performing initialize task...');
                setProgress(100);
                await sleep(3);
                setCurrentPreMessage('Setup task complete!');
                await sleep(1);
                await invoke('set_complete', {task: 'frontend'});
            } catch (error) {
                console.error('Failed to read pre-messages:', error);
                setError('Failed to read fetch pre-messages');
            }
        };

        fetchPreMessages();
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
                    initial={{y: -20, opacity: 0}}
                    animate={{y: 0, opacity: 1}}
                    transition={{duration: 0.5}}
                >
                    <h1 className="text-2xl font-bold text-white text-center">LockerZ</h1>
                </motion.div>
                <motion.div
                    initial={{scale: 0.8, opacity: 0}}
                    animate={{scale: 1, opacity: 1}}
                    transition={{delay: 0.2, duration: 0.5}}
                >
                    <p className="text-sm text-white text-center">It's doing something, don't worry!</p>
                </motion.div>
                <motion.div
                    initial={{width: '0%'}}
                    animate={{width: '100%'}}
                    transition={{duration: 0.5, delay: 0.4}}
                >
                    <Progress
                        value={progress}
                        className="h-1 bg-white/20"
                    />
                </motion.div>
                <div className="flex justify-between items-center text-white text-xs">
                    <p>{error ? error : wrapText(currentPreMessage || "Loading assets")}</p>
                    <span className="font-semibold">{progress}%</span>
                </div>
                <RotatingTips/>
            </div>
        </div>
    )
}

