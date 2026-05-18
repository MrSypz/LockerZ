import { useEffect, useState } from 'react'
import i18n from 'i18next'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import resourcesToBackend from 'i18next-resources-to-backend'
import { languages } from '@/lib/lang'

interface I18nProviderProps {
    children: React.ReactNode
    initialLang: string
    onLanguageChange: (lang: string) => void
}

const initI18n = async (initialLang: string) => {
    if (!i18n.isInitialized) {
        await i18n
            .use(initReactI18next)
            .use(LanguageDetector)
            .use(resourcesToBackend((language: string, namespace: string) =>
                import(`../../public/locales/${language}/${namespace}.json`)
            ))
            .init({
                fallbackLng: initialLang,
                supportedLngs: Object.keys(languages),
                lng: initialLang,
                interpolation: { escapeValue: false },
            })
    } else {
        await i18n.changeLanguage(initialLang)
    }
}

export default function I18nProvider({ children, initialLang, onLanguageChange }: I18nProviderProps) {
    const [isInitialized, setIsInitialized] = useState(false)

    useEffect(() => {
        initI18n(initialLang).then(() => {
            document.documentElement.setAttribute('data-lang', initialLang)
            setIsInitialized(true)
        })

        const handleLangChanged = (lang: string) => {
            document.documentElement.setAttribute('data-lang', lang)
            onLanguageChange(lang)
        }
        i18n.on('languageChanged', handleLangChanged)
        return () => { i18n.off('languageChanged', handleLangChanged) }
    }, [initialLang, onLanguageChange])

    if (!isInitialized) return null

    return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
