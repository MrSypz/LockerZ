'use client'

import './globals.css'
import '../styles/scrollbar.css'  // Import the custom scrollbar styles

import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import I18nProvider from '@/components/I18nProvider'
import { useTranslation } from 'react-i18next'

import { notoSansMono, notoSansThai } from '@/lib/fonts'

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    const { i18n } = useTranslation()
    const fontClass = i18n.language === 'th' ? notoSansThai.className : notoSansMono.className

    return (
        <html lang={i18n.language} suppressHydrationWarning>
        <body className={fontClass}>
        <I18nProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <div className="flex h-screen bg-background text-foreground">
                    <div className="flex flex-col flex-1 overflow-hidden">
                        <main className="flex-1 overflow-auto">
                            {children}
                        </main>
                    </div>
                    <Toaster/>
                </div>
            </ThemeProvider>
        </I18nProvider>
        </body>
        </html>
    )
}

