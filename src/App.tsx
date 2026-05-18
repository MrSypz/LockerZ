import { Routes, Route } from "react-router-dom"
import { Layout } from "@/components/layout/Layout"
import HomePage from "@/pages/Home"
import LockerPage from "@/pages/Locker"
import CategoryPage from "@/pages/Category"
import SettingsPage from "@/pages/Settings"
import DupeCheckerPage from "@/pages/DupeChecker"
import AboutPage from "@/pages/About"

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/"                    element={<HomePage />} />
        <Route path="/locker"              element={<LockerPage />} />
        <Route path="/category"            element={<CategoryPage />} />
        <Route path="/settings"            element={<SettingsPage />} />
        <Route path="/feature/imagedupe"   element={<DupeCheckerPage />} />
        <Route path="/about"               element={<AboutPage />} />
      </Routes>
    </Layout>
  )
}
