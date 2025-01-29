'use client'
import DuplicateChecker from "@/components/widget/DuplicateChecker"
import React from "react";

export default function ImageDupe() {
    return (
        <div className="flex flex-col h-screen">
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-8">
                    <h1 className="text-3xl font-bold mb-6 text-foreground">Image Dupe Checker</h1>
                    <DuplicateChecker/>
                </div>
            </main>
        </div>
    )
}