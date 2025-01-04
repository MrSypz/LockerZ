'use client'

import './globals.css'
import '../styles/scrollbar.css'
import { ThemeProvider } from '@/components/Theme-provider'
import { Toaster } from '@/components/ui/toaster'
import I18nProvider from '@/components/I18nProvider'
import { notoSansMono, notoSansThai } from '@/lib/fonts'
import React, { useEffect, useState, useCallback } from "react"
import { usePathname } from 'next/navigation'
import {Sidebar} from "@/components/widget/Sidebar";
import { SettingsProvider } from "@/utils/SettingsContext";
import {invoke} from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/window"

interface Settings {
    folderPath: string;
    rememberCategory: boolean;
    lang: string;
    imageQuality: number;
    imageWidth: number;
    imageHeight: number;
}

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    const [currentLang, setCurrentLang] = useState('en')
    const [mounted, setMounted] = useState(false)
    const pathname = usePathname()
    const [appWindow, setAppWindow] = useState<WebviewWindow>()
    const fetchLanguageSetting = useCallback(async () => {
        try {
            const data:Settings = await invoke("get_settings");
            const newLang = data.lang || 'en'
            if (newLang !== currentLang) {
                setCurrentLang(newLang)
                console.log("Language updated:", newLang)
            }
        } catch (error) {
            console.error('Error fetching language setting:', error)
        }
    }, [currentLang])

    function windowMinimize() {
        appWindow?.minimize()
    }
    function windowToggleMaximize() {
        appWindow?.toggleMaximize()
    }
    function windowClose() {
        appWindow?.close()
    }

    // Import appWindow and save it inside the state for later usage
    async function setupAppWindow() {
        const appWindow = (await import('@tauri-apps/api/window')).getCurrentWindow()
        setAppWindow(appWindow)
    }

    useEffect(() => {
        setupAppWindow()
    }, [])

    useEffect(() => {
        if (!mounted) {
            fetchLanguageSetting()
            setMounted(true)
        }
    }, [mounted, fetchLanguageSetting])

    useEffect(() => {
        if (mounted) {
            fetchLanguageSetting()
        }
    }, [pathname, mounted, fetchLanguageSetting])

    const fontClass = currentLang === 'th' ? notoSansThai.className : notoSansMono.className
    return (
        <html lang={currentLang} suppressHydrationWarning>
        <body className={`${fontClass} custom-scrollbar`}>
        <div
            data-tauri-drag-region="true"
            className="titlebar"
        >
            <div className="titlebar-buttons">
                <img src="/icon.png" className="titlebar-icon" alt="App Icon"/>
                <div className="titlebar-button" id="titlebar-minimize" onClick={windowMinimize}>
                    <img
                        src="https://api.iconify.design/mdi:window-minimize.svg"
                        alt="minimize"
                    />
                </div>
                <div className="titlebar-button" id="titlebar-maximize" onClick={windowToggleMaximize}>
                    <img
                        src="https://api.iconify.design/mdi:window-maximize.svg"
                        alt="maximize"
                    />
                </div>
                <div className="titlebar-button" id="titlebar-close" onClick={windowClose}>
                    <img
                        src="https://api.iconify.design/mdi:close.svg"
                        alt="close"
                    />
                </div>
            </div>
        </div>
        <SettingsProvider>
            <I18nProvider initialLang={currentLang} onLanguageChangeAction={setCurrentLang}>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                    <div className="flex h-screen bg-background text-foreground">
                        <Sidebar/>
                        <div className="flex flex-col flex-1 overflow-hidden">
                            <main className="flex-1 overflow-auto">
                                {mounted ? children : null}
                            </main>
                            <Toaster/>
                        </div>
                        </div>
                    </ThemeProvider>
                </I18nProvider>
            </SettingsProvider>
        </body>
        </html>
)
}

