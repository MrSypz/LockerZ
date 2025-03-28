'use client'

import './globals.css'
import '../styles/scrollbar.css'
import { ThemeProvider } from '@/components/Theme-provider'
import { Toaster } from '@/components/ui/toaster'
import I18nProvider from '@/components/I18nProvider'
import {notoSansThai} from '@/lib/fonts'
import React, { useEffect, useState, useCallback } from "react"
import { usePathname } from 'next/navigation'
import {Sidebar} from "@/components/widget/Sidebar";
import { SettingsProvider } from "@/utils/SettingsContext";
import {invoke} from "@tauri-apps/api/core";
// @ts-ignore
import { WebviewWindow } from "@tauri-apps/api/window"
import UploadProgress from "@/components/widget/ProgressInfo";
import {Settings} from "@/types/file";

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
            fetchLanguageSetting().then(r => setMounted(true))
        }
    }, [mounted, fetchLanguageSetting])

    useEffect(() => {
        if (mounted) {
            fetchLanguageSetting()
        }
    }, [pathname, mounted, fetchLanguageSetting])

    const fontClass = notoSansThai.className;

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
                        src="/mdi_window-minimize.svg"
                        alt="minimize"
                    />
                </div>
                <div className="titlebar-button" id="titlebar-maximize" onClick={windowToggleMaximize}>
                    <img
                        src="/mdi_window-maximize.svg"
                        alt="maximize"
                    />
                </div>
                <div className="titlebar-button" id="titlebar-close" onClick={windowClose}>
                    <img
                        src="/mdi_close.svg"
                        alt="close"
                    />
                </div>
            </div>
        </div>
        <SettingsProvider>
            <I18nProvider initialLang={currentLang} onLanguageChangeAction={setCurrentLang}>
                <ThemeProvider attribute="class" defaultTheme="root" enableSystem={false}>
                    <div className="flex h-screen bg-background text-foreground">
                        <Sidebar/>
                        <div className="flex flex-col flex-1 overflow-hidden">
                            <main className="flex-1 overflow-auto">
                                {mounted ? children : null}
                            </main>
                            <UploadProgress />
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

