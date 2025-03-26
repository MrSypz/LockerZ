import Dashboard from "@/components/widget/Dashboard"

export default function Home() {
    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-background/80">
            <section className="w-full py-8 md:py-12">
                <div className="container px-4 md:px-6 mx-auto">
                    <div className="flex flex-col items-start gap-4">
                        <div className="w-full p-4 sm:p-6 bg-card rounded-lg border shadow-sm">
                            <Dashboard />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}

