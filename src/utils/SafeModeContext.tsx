import { createContext, useContext, useState, ReactNode } from "react"

interface SafeModeContextValue {
    isSafeMode: boolean
    toggle: () => void
}

const SafeModeContext = createContext<SafeModeContextValue>({
    isSafeMode: true,
    toggle: () => {},
})

export function SafeModeProvider({ children }: { children: ReactNode }) {
    const [isSafeMode, setIsSafeMode] = useState(true)
    const toggle = () => setIsSafeMode(prev => !prev)
    return (
        <SafeModeContext.Provider value={{ isSafeMode, toggle }}>
            {children}
        </SafeModeContext.Provider>
    )
}

export function useSafeMode() {
    return useContext(SafeModeContext)
}
