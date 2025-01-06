import {Dashboard} from "@/components/widget/Dashboard"
import {Changelog} from "@/components/widget/Changelog"

export default function Home() {

    return (
        <div className="flex flex-col h-screen">
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-8">
                    <Dashboard/>
                    <Changelog/>
                </div>
            </main>
        </div>
    )
}