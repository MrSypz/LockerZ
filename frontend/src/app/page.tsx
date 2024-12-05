import Link from 'next/link'
import { Sidebar } from "@/components/sidebar"
import { Dashboard } from "@/components/dashboard"
import { Changelog } from "@/components/changelog"

const changelogItems = [
    {
        version: "0.1.0",
        date: "2-12-2024",
        features: ["Re-write the lockerZ"],
        fixes:["remove the flask python server due to lack of performance and slowness"],
        qol:["Change the entire frontend feature"]
    },
];

export default function Home() {
    return (
        <div className="flex h-screen bg-background">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto">
                    <h1 className="text-3xl font-bold p-6 gradient-text">Dashboard</h1>
                    <Dashboard />
                    <Changelog items={changelogItems} />
                </main>
            </div>
        </div>
    )
}

