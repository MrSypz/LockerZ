import { useState, useEffect } from "react"
import { getVersion } from "@tauri-apps/api/app"
import { Github } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

export default function AboutPage() {
  const [appVersion, setAppVersion] = useState("Loading...")

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion("Unknown"))
  }, [])

  return (
    <div className="container mx-auto py-10 px-6">
      <h1 className="text-4xl font-bold mb-10 gradient-text-header">About</h1>

      <div className="grid gap-10 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>What is LockerZ?</CardTitle>
            <CardDescription>A fast, local image reference manager</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">LockerZ is a lightweight desktop app for organizing and browsing large image collections with categories, tags, and duplicate detection.</p>
            <p className="text-sm text-muted-foreground">Built with Tauri 2 and Rust for native performance with a minimal footprint.</p>
            <p className="text-sm text-muted-foreground">All data stays local — no cloud, no telemetry.</p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <a href="https://github.com/MrSypz/LockerZ/issues/new" target="_blank" rel="noopener noreferrer">
                <Github className="mr-2 h-4 w-4" />
                Report an Issue
              </a>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>App Details</CardTitle>
            <CardDescription>Version and build information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Version</Label>
              <p className="text-sm text-muted-foreground">{appVersion}</p>
            </div>
            <div>
              <Label>Developer</Label>
              <p className="text-sm text-muted-foreground">MrSypz</p>
            </div>
            <div>
              <Label>Source</Label>
              <p className="text-sm text-muted-foreground">
                <a href="https://github.com/MrSypz/LockerZ" className="text-primary hover:underline">
                  github.com/MrSypz/LockerZ
                </a>
              </p>
            </div>
            <div>
              <Label>License</Label>
              <p className="text-sm text-muted-foreground">MIT</p>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} MrSypz. All rights reserved.</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
