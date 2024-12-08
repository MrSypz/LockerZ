"use client"

import Link from "next/link"
import { Home, FolderOpen, Image, Settings, Menu } from 'lucide-react'
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { ModeToggle } from "@/components/mode-toggle"
import { getVersion } from "@tauri-apps/api/app";

const menuItems = [
  { icon: Home, label: "Dashboard", href: "/" },
  { icon: Image, label: "My Locker", href: "/locker" },
  { icon: FolderOpen, label: "My Category", href: "/category" },
  { icon: Settings, label: "Settings", href: "/settings" },
]

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [appVersion, setAppVersion] = useState("0.0.0")

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const version = await getVersion();
        setAppVersion(version);
      } catch (error) {
        console.error("Failed to fetch app version:", error);
        setAppVersion("Unknown");
      }
    };

    fetchVersion();
  }, []);

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
            <Menu size={24} />
          </button>
        </div>
        <nav className="flex-1">
          <ul className="space-y-2">
            {menuItems.map((item) => (
                <li key={item.label}>
                  <Link
                      href={item.href}
                      className="flex items-center p-2 rounded-md hover:bg-primary/20 hover-lift"
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
        <div className="mt-auto pt-4 space-y-2">
          <ModeToggle collapsed={isCollapsed} />
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

