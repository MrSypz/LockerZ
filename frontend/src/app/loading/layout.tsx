'use client'

import {notoSansMono} from '@/lib/fonts'
import {Toaster} from "@/components/ui/toaster";
import React from "react";

export default function SplashScreenLayout({
                                               children,
                                           }: {
    children: React.ReactNode
}) {


    return (
        <html lang="en">
        <body className={`${notoSansMono.className}`} style={{background: 'transparent'}}>
        <div className="flex h-screen text-foreground">
            <div className="flex flex-col flex-1 overflow-hidden">
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
                <Toaster/>
            </div>
        </div>
        </body>
        </html>
    )
}

