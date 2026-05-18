import { Routes, Route } from "react-router-dom"
import { Layout } from "@/components/layout/Layout"
import LockerPage from "@/pages/Locker"
import CategoryPage from "@/pages/Category"
import SettingsPage from "@/pages/Settings"
import AboutPage from "@/pages/About"

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/"          element={<LockerPage />} />
        <Route path="/locker"    element={<LockerPage />} />
        <Route path="/category"  element={<CategoryPage />} />
        <Route path="/settings"  element={<SettingsPage />} />
        <Route path="/about"     element={<AboutPage />} />
      </Routes>
    </Layout>
  )
}
