"use client"

import * as React from "react"
import { Moon, Sun } from 'lucide-react'
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ModeToggle({ collapsed }: { collapsed?: boolean }) {
    const { theme, setTheme } = useTheme()
    const [currentTheme, setCurrentTheme] = React.useState<'light' | 'dark'>('light')

    React.useEffect(() => {
        setCurrentTheme(theme as 'light' | 'dark')
    }, [theme])

    const toggleTheme = () => {
        const newTheme = currentTheme === 'light' ? 'dark' : 'light'
        setTheme(newTheme)
        setCurrentTheme(newTheme)
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="w-full flex items-center justify-start p-2 rounded-md hover:bg-primary/20 hover-lift"
                    onClick={toggleTheme}
                >
                    {currentTheme === 'light' ? (
                        <Sun className="h-[1.2rem] w-[1.2rem]" />
                    ) : (
                        <Moon className="h-[1.2rem] w-[1.2rem]" />
                    )}
                    {!collapsed && <span className="ml-4">{currentTheme === 'light' ? 'Dark mode' : 'Light mode'}</span>}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="bg-popover text-popover-foreground border border-border rounded-md shadow-md"
            >
                <DropdownMenuItem
                    onClick={() => setTheme("light")}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
                >
                    Light
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setTheme("dark")}
                    className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
                >
                    Dark
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

