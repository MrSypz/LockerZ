import type { ReactNode } from "react"
import { TitleBar } from "./TitleBar"
import { Sidebar } from "./Sidebar"

export function Layout({ children }: { children: ReactNode }) {
  return (
    /*
     * Column layout so TitleBar takes its natural h-8, then the row below
     * fills exactly the remaining height — content never slides under the bar.
     */
    <div className="flex flex-col h-screen overflow-hidden">
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
