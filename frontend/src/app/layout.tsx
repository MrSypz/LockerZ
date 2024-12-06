import './globals.css'
import { Inter } from 'next/font/google'
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <div className="flex h-screen bg-background text-foreground">
                <div className="flex flex-col flex-1 overflow-hidden">
                    <main className="flex-1 overflow-auto">
                        {children}
                    </main>
                </div>
            </div>
        </ThemeProvider>
        </body>
        </html>
    )
}

