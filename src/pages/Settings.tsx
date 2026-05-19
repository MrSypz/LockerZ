import { open } from '@tauri-apps/plugin-dialog'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { useSharedSettings } from '@/utils/SettingsContext'
import SettingsMenu from '@/components/widget/setting_menu/SettingsMenu'
import type { Settings } from '@/types/file'

export default function SettingsPage() {
  const { settings, updateSettings, isLoading } = useSharedSettings()
  const { i18n } = useTranslation()

  const handleChange = async (patch: Partial<Settings>) => {
    await updateSettings(patch)
    if ('lang' in patch && patch.lang) {
      await i18n.changeLanguage(patch.lang)
    }
  }

  const handleBrowse = async () => {
    const selected = await open({ directory: true, multiple: false, defaultPath: settings?.folderPath })
    if (selected) {
      if (settings?.rememberCategory) {
        localStorage.setItem('lastSelectedCategory', 'all')
      }
      await handleChange({ folderPath: selected })
    }
  }

  if (isLoading || !settings) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return <SettingsMenu settings={settings} onChange={handleChange} onBrowse={handleBrowse} />
}
