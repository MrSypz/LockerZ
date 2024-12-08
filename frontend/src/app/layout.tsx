import './globals.css'
import {Noto_Sans_Mono} from 'next/font/google';
import {ThemeProvider} from "@/components/theme-provider"
import {Toaster} from "@/components/ui/toaster"
import I18nProvider from '@/components/I18nProvider'

const notoSansMono = Noto_Sans_Mono({
    subsets: ['latin'],
    weight: ['100', '200', '400', '600', '700'], // Choose the weights you want
});
export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
        <body className={notoSansMono.className}>
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

