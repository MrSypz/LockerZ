"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {Home, FolderOpen, Image, Settings, Menu, Info} from 'lucide-react'
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { getVersion } from "@tauri-apps/api/app"
import { useTranslation } from 'react-i18next'

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [appVersion, setAppVersion] = useState("0.0.0")
  const { t } = useTranslation()
  const pathname = usePathname()

  const menuItems = [
    { icon: Home, label: t('sidebar.home'), href: "/" },
    { icon: Image, label: t('sidebar.image'), href: "/locker" },
    { icon: FolderOpen, label: t('sidebar.folder'), href: "/category" },
    { icon: Settings, label: t('sidebar.settings'), href: "/settings" },
    { icon: Info , label: t('sidebar.about'), href: "/about" }
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
  useEffect(() => {
    const titlebar = document.querySelector('.titlebar');
    if (titlebar) {
      if (isCollapsed) {
        titlebar.classList.remove('titlebar-expanded');
        titlebar.classList.add('titlebar-collapsed');
      } else {
        titlebar.classList.remove('titlebar-collapsed');
        titlebar.classList.add('titlebar-expanded');
      }
    }
  }, [isCollapsed]);


  return (
      <aside
          className={cn(
              "flex flex-col h-screen bg-secondary p-4 transition-all duration-300",
              isCollapsed ? "w-16" : "w-64"
          )}
      >
        <div className="flex items-center justify-between mb-8">
          <h1
              className={cn(
                  "text-2xl font-bold gradient-text",
                  isCollapsed && "hidden"
              )}
          >
            LockerZ
          </h1>
          <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-md hover:bg-primary/20"
          >
            <Menu size={24}/>
          </button>
        </div>
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
                    <item.icon size={24} className="text-primary"/>
                    {!isCollapsed && (
                        <span className="ml-4 text-foreground">{item.label}</span>
                    )}
                  </Link>
                </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto pt-4 space-y-2">
          <div className={cn(
              "text-xs text-muted-foreground",
              isCollapsed ? "text-center" : "px-2"
          )}>
            {isCollapsed ? appVersion : `LockerZ ${appVersion}`}
          </div>
        </div>
      </aside>
  )
}

