import { useState, useEffect, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { API_URL } from "@/lib/zaphire";
import {useTranslation} from "react-i18next";
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
    //     folderPath: "",
    //     rememberCategory: false,
    //     lang: "en",
    //     imageQuality: 100,
    //     imageWidth: 300,
    //     imageHeight: 450
    // });
    const [settings, setSettings] = useState<Settings | null>(null);

    const [isLoading, setIsLoading] = useState(true);


    const fetchSettings = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/get-settings`);
            if (!response.ok) new Error("Failed to fetch settings");
            const data = await response.json();
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
                const response = await fetch(`${API_URL}/update-settings`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(newSettings),
                });
                if (!response.ok) throw new Error("Failed to update settings");
                const data = await response.json();
                if (data.success) {
                    setSettings(prevSettings => ({ ...prevSettings, ...newSettings } as Settings));
                    toast({
                        title: t('toast.titleType.success'),
                        description: t('settings.toast.success'),
                    });
                } else {
                    throw new Error("Failed to update settings");
                }
            } catch (error) {
                console.error("Error updating settings:", error);
                toast({
                    title: t('toast.titleType.error'),
                    description: t('settings.toast.error'),
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
