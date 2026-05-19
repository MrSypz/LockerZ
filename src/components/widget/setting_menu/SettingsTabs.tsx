import { useTranslation } from 'react-i18next'
import SettingsMenuIcon from './SettingsMenuIcon'
import { SETTINGS_TABS } from './settingsMenuData'
import type { TabId } from './settingsMenuTypes'
import { cn } from '@/lib/utils'

interface SettingsTabsProps {
  selectedTab: TabId
  onSelect: (tab: TabId) => void
}

export default function SettingsTabs({ selectedTab, onSelect }: SettingsTabsProps) {
  const { t } = useTranslation()
  return (
    <nav className="flex gap-1" aria-label="Settings sections">
      {SETTINGS_TABS.map(item => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            item.id === selectedTab
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          <SettingsMenuIcon name={item.icon} />
          {t(item.labelKey, item.id)}
        </button>
      ))}
    </nav>
  )
}
