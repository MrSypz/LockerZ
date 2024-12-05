import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'LockerZ',
    description: 'Secure file management system',
}

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
        <body className={inter.className}>
        <div className="flex h-screen">
            <div className="flex flex-col flex-1 overflow-hidden">
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
        </body>
        </html>
    )
}

