import { useState, useEffect, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import {invoke} from "@tauri-apps/api/core";
import {t} from "i18next";

interface Settings {
    folderPath: string;
    rememberCategory: boolean;
    lang: string;
    imageQuality: number;
    imageWidth: number;
    imageHeight: number;
}
export function useSettings() {
    const [settings, setSettings] = useState<Settings | null>(null);

    const [isLoading, setIsLoading] = useState(true);

    const fetchSettings = useCallback(async () => {
        setIsLoading(true);
        try {
            const data:Settings = await invoke("get_settings");
            setSettings(data);
        } catch (error) {
            console.error("Error fetching settings:", error);
            toast({
                title: "Error",
                description: "Failed to fetch settings",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateSettings = useCallback(
        async (newSettings: Partial<Settings>) => {
            try {
                const currentSettings = await invoke<Settings>("get_settings");
                const mergedSettings = { ...currentSettings, ...newSettings };
                const updatedConfig: Settings = await invoke("update_settings", {
                    newSettings: mergedSettings
                });
                setSettings(updatedConfig);
                toast({
                    title: t("toast.titleType.success"),
                    description: t("settings.toast.success"),
                });
            } catch (error) {
                console.error("Error updating settings:", error);
                toast({
                    title: t("toast.titleType.error"),
                    description: t("settings.toast.error"),
                    variant: "destructive",
                });
            }
        },
        []
    );

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    return { settings, updateSettings, fetchSettings, isLoading };
}
