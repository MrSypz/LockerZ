"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  FolderOpen,
  Image,
  Settings,
  Menu,
  Info,
  CheckSquare,
} from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getVersion } from "@tauri-apps/api/app"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [appVersion, setAppVersion] = useState("0.0.0")
  const { t } = useTranslation()
  const pathname = usePathname()

  const menuItems = [
    { icon: Home, label: t("sidebar.home"), href: "/" },
    { icon: Image, label: t("sidebar.image"), href: "/locker" },
    { icon: FolderOpen, label: t("sidebar.folder"), href: "/category" },
    { icon: Settings, label: t("sidebar.settings"), href: "/settings" },
    { icon: CheckSquare, label: t("sidebar.feature.imagedupe"), href: "/feature/imagedupe/" },
    { icon: Info, label: t("sidebar.about"), href: "/about" },
  ]

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const version = await getVersion()
        setAppVersion(version)
      } catch (error) {
        setAppVersion("Unknown")
      }
    }

    fetchVersion()
  }, [])

  return (
      <Card
          className={cn(
              "flex flex-col h-screen bg-secondary p-4 transition-all duration-300",
              isCollapsed ? "w-16" : "w-64"
          )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          {!isCollapsed && (
              <h1 className="text-2xl font-bold gradient-text-header">LockerZ</h1>
          )}
          <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <Menu size={24} />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1">
          <ul className="space-y-2">
            {menuItems.map((item) => (
                <li key={item.label}>
                  <Link
                      href={item.href}
                      className={cn(
                          "flex items-center p-2 rounded-md hover:bg-primary/20 hover-lift",
                          pathname === item.href && "bg-primary/20"
                      )}
                  >
                    <item.icon size={24} className="text-primary" />
                    {!isCollapsed && (
                        <span className="ml-4 text-foreground">{item.label}</span>
                    )}
                  </Link>
                </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <Separator className="my-4" />
        <div className="mt-auto text-xs text-muted-foreground">
          {isCollapsed ? appVersion : `LockerZ ${appVersion}`}
        </div>
      </Card>
  )
}
