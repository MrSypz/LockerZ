import { createContext, useContext, ReactNode } from "react";
import { useSettings } from "@/hooks/useSettings";

const SettingsContext = createContext<any>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const settingsHook = useSettings();
    return (
        <SettingsContext.Provider value={settingsHook}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSharedSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error("useSharedSettings must be used within a SettingsProvider");
    }
    return context;
}
