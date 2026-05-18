import { useState, useEffect, useCallback } from "react"
import { Routes, Route } from "react-router-dom"
import { invoke } from "@tauri-apps/api/core"
import { Layout } from "@/components/layout/Layout"
import { SettingsProvider } from "@/utils/SettingsContext"
import I18nProvider from "@/components/I18nProvider"
import HomePage from "@/pages/Home"
import LockerPage from "@/pages/Locker"
import CategoryPage from "@/pages/Category"
import SettingsPage from "@/pages/Settings"
import DupeCheckerPage from "@/pages/DupeChecker"
import AboutPage from "@/pages/About"

export default function App() {
  const [currentLang, setCurrentLang] = useState("en")

  useEffect(() => {
    invoke<{ lang: string }>("get_settings")
      .then((s) => setCurrentLang(s.lang || "en"))
      .catch(() => {})
  }, [])

  const handleLanguageChange = useCallback((lang: string) => {
    setCurrentLang(lang)
  }, [])

  return (
    <I18nProvider initialLang={currentLang} onLanguageChange={handleLanguageChange}>
      <SettingsProvider>
        <Layout>
          <Routes>
            <Route path="/"                  element={<HomePage />} />
            <Route path="/locker"            element={<LockerPage />} />
            <Route path="/category"          element={<CategoryPage />} />
            <Route path="/settings"          element={<SettingsPage />} />
            <Route path="/feature/imagedupe" element={<DupeCheckerPage />} />
            <Route path="/about"             element={<AboutPage />} />
          </Routes>
        </Layout>
      </SettingsProvider>
    </I18nProvider>
  )
}
