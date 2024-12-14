'use client'

import { useEffect, useState } from 'react'
import i18n from 'i18next'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import resourcesToBackend from 'i18next-resources-to-backend'

interface I18nProviderProps {
    children: React.ReactNode;
    initialLang: string;
    onLanguageChangeAction: (lang: string) => void;
}

const initI18n = async (initialLang: string) => {
    if (!i18n.isInitialized) {
        await i18n
            .use(initReactI18next)
            .use(LanguageDetector)
            .use(resourcesToBackend((language: string, namespace: string) => import(`../../public/locales/${language}/${namespace}.json`)))
            .init({
                fallbackLng: initialLang,
                supportedLngs: ['en', 'th'],
                lng: initialLang,
                interpolation: {
                    escapeValue: false,
                },
            });
    } else {
        await i18n.changeLanguage(initialLang);
    }
}

export default function I18nProvider({ children, initialLang, onLanguageChangeAction }: I18nProviderProps) {
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        initI18n(initialLang).then(() => setIsInitialized(true));

        const handleLanguageChanged = (lang: string) => {
            onLanguageChangeAction(lang);
        };

        i18n.on('languageChanged', handleLanguageChanged);

        return () => {
            i18n.off('languageChanged', handleLanguageChanged);
        };
    }, [initialLang, onLanguageChangeAction]);

    if (!isInitialized) {
        return null; // or a loading spinner
    }

    return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

