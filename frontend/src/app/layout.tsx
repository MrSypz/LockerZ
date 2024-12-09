'use client'

import './globals.css'
import '../styles/scrollbar.css'
import { ThemeProvider } from '@/components/Theme-provider'
import { Toaster } from '@/components/ui/toaster'
import I18nProvider from '@/components/I18nProvider'
import { notoSansMono, notoSansThai } from '@/lib/fonts'
import React, { useEffect, useState, useCallback } from "react"
import { usePathname } from 'next/navigation'

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    const [currentLang, setCurrentLang] = useState('en')
    const [mounted, setMounted] = useState(false)
    const pathname = usePathname()

    const fetchLanguageSetting = useCallback(async () => {
        try {
            const response = await fetch('http://localhost:3001/get-settings')
            const data = await response.json()
            const newLang = data.lang || 'en'
            if (newLang !== currentLang) {
                setCurrentLang(newLang)
                console.log("Language updated:", newLang)
            }
        } catch (error) {
            console.error('Error fetching language setting:', error)
        }
    }, [currentLang])

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
        <I18nProvider initialLang={currentLang} onLanguageChangeAction={setCurrentLang}>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <div className="flex h-screen bg-background text-foreground">
                    <div className="flex flex-col flex-1 overflow-hidden">
                        <main className="flex-1 overflow-auto">
                            {mounted ? children : null}
                        </main>
                        <Toaster/>
                    </div>
                </div>
            </ThemeProvider>
        </I18nProvider>
        </body>
        </html>
    )
}

