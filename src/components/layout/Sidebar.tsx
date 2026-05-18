import { Link, useLocation } from "react-router-dom"
import { Home, FolderOpen, Image, Settings, Menu, Info, CheckSquare } from "lucide-react"
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getVersion } from "@tauri-apps/api/app"
import { cn } from "@/lib/utils"

const menuItems = [
  { icon: Home,        labelKey: "sidebar.home",           to: "/" },
  { icon: Image,       labelKey: "sidebar.image",          to: "/locker" },
  { icon: FolderOpen,  labelKey: "sidebar.folder",         to: "/category" },
  { icon: Settings,    labelKey: "settings.title",         to: "/settings" },
  { icon: CheckSquare, labelKey: "sidebar.feature.imagedupe", to: "/feature/imagedupe" },
  { icon: Info,        labelKey: "about.title",            to: "/about" },
]

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [appVersion, setAppVersion] = useState("0.0.0")
  const { pathname } = useLocation()
  const { t } = useTranslation()

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion("Unknown"))
  }, [])

  return (
    <Card
      className={cn(
        "flex flex-col h-full rounded-none border-y-0 border-l-0 bg-secondary p-4",
        "transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex items-center justify-between mb-8">
        {!isCollapsed && (
          <h1 className="text-2xl font-bold gradient-text-header">LockerZ</h1>
        )}
        <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)}>
          <Menu size={24} />
        </Button>
      </div>

      <nav className="flex-1">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  "flex items-center p-2 rounded-md hover:bg-primary/20",
                  pathname === item.to && "bg-primary/20",
                )}
              >
                <item.icon size={24} className="text-primary shrink-0" />
                {!isCollapsed && (
                  <span className="ml-4 text-foreground">{t(item.labelKey)}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <Separator className="my-4" />
      <div className="text-xs text-muted-foreground">
        {isCollapsed ? appVersion : `LockerZ ${appVersion}`}
      </div>
    </Card>
  )
}
