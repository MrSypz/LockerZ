import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RotateCcw } from 'lucide-react'
import { DatabaseService, type TagInfo } from '@/hooks/use-database'
import type { Settings } from '@/types/file'
import type { TabId } from './settingsMenuTypes'
import { firstFieldIdForTab, resetSettingsPatch, SETTINGS_FIELDS, SETTINGS_TABS } from './settingsMenuData'
import { cycleOption } from './settingsMenuUtils'
import SettingsDetailsPanel from './SettingsDetailsPanel'
import SettingsFieldRow from './SettingsFieldRow'
import SettingsTabs from './SettingsTabs'

interface SettingsMenuProps {
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  onBrowse: () => void
}

export default function SettingsMenu({ settings, onChange, onBrowse }: SettingsMenuProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<TabId>('general')
  const [activeId, setActiveId] = useState(firstFieldIdForTab('general'))
  const [inputMode, setInputMode] = useState<'keyboard' | 'pointer'>('keyboard')
  const [allTags, setAllTags] = useState<string[]>([])

  useEffect(() => {
    new DatabaseService().getAllTags()
      .then((tags: TagInfo[]) => setAllTags(tags.map(t => t.name)))
      .catch(() => {})
  }, [])

  // Auto-prune orphaned sensitive tags that no longer exist in the tag table
  useEffect(() => {
    if (allTags.length === 0) return
    const current = settings.sensitive_tags ?? []
    const valid = current.filter(t => allTags.includes(t))
    if (valid.length !== current.length) {
      onChange({ sensitive_tags: valid })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTags])

  const fields = useMemo(() => SETTINGS_FIELDS.filter(f => f.tab === tab), [tab])
  const activeField = fields.find(f => f.id === activeId) ?? fields[0]

  const selectTab = useCallback((nextTab: TabId) => {
    setTab(nextTab)
    setActiveId(firstFieldIdForTab(nextTab))
  }, [])

  const cycleTab = useCallback((direction: 1 | -1) => {
    setInputMode('keyboard')
    const index = Math.max(0, SETTINGS_TABS.findIndex(item => item.id === tab))
    const next = SETTINGS_TABS[(index + direction + SETTINGS_TABS.length) % SETTINGS_TABS.length].id
    selectTab(next)
  }, [selectTab, tab])

  const cycleField = useCallback((direction: 1 | -1) => {
    setInputMode('keyboard')
    const index = Math.max(0, fields.findIndex(f => f.id === activeId))
    const next = fields[(index + direction + fields.length) % fields.length]
    if (next) setActiveId(next.id)
  }, [activeId, fields])

  const adjustField = useCallback((direction: 1 | -1) => {
    setInputMode('keyboard')
    if (!activeField) return
    if (activeField.control === 'range') {
      const current = activeField.getValue(settings)
      const next = Math.min(activeField.max, Math.max(activeField.min, current + activeField.step * direction))
      onChange(activeField.toPatch(next))
      return
    }
    if (activeField.control === 'toggle') {
      onChange(activeField.toPatch(direction === 1))
      return
    }
    if (activeField.control === 'option') {
      onChange(activeField.toPatch(cycleOption(activeField.options, activeField.getValue(settings), direction)))
    }
  }, [activeField, onChange, settings])

  const confirmField = useCallback(() => {
    setInputMode('keyboard')
    if (!activeField) return
    if (activeField.control === 'toggle') {
      onChange(activeField.toPatch(!activeField.getValue(settings)))
      return
    }
    if (activeField.control === 'option') {
      onChange(activeField.toPatch(cycleOption(activeField.options, activeField.getValue(settings), 1)))
      return
    }
    if (activeField.control === 'filepath') {
      onBrowse()
    }
  }, [activeField, onChange, onBrowse, settings])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return
      if (e.key === 'q' || e.key === 'Q') { e.preventDefault(); cycleTab(-1) }
      else if (e.key === 'e' || e.key === 'E') { e.preventDefault(); cycleTab(1) }
      else if (e.key === 'Tab') { e.preventDefault(); cycleField(e.shiftKey ? -1 : 1) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); cycleField(-1) }
      else if (e.key === 'ArrowDown') { e.preventDefault(); cycleField(1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); adjustField(-1) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); adjustField(1) }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); confirmField() }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [adjustField, confirmField, cycleField, cycleTab])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <h1 className="text-2xl font-bold gradient-text-header">{t('settings.title')}</h1>
        <SettingsTabs selectedTab={tab} onSelect={selectTab} />
      </div>

      {/* Main — field list + details panel */}
      <div className="flex flex-1 min-h-0">
        <section className="flex flex-col w-72 shrink-0 border-r">
          <div className="flex items-center justify-between px-4 py-2.5 border-b">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              {t(`settings.tab.${tab}`, { defaultValue: tab })}
            </span>
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => onChange(resetSettingsPatch(fields))}
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {fields.map(field => (
              <SettingsFieldRow
                key={field.id}
                field={field}
                settings={settings}
                active={inputMode === 'keyboard' && activeId === field.id}
                onKeyboardFocus={(id) => { setInputMode('keyboard'); setActiveId(id) }}
                onPointerFocus={(id) => { setInputMode('pointer'); setActiveId(id) }}
              />
            ))}
          </div>
        </section>

        <div className="flex-1 overflow-y-auto">
          {activeField && (
            <SettingsDetailsPanel
              field={activeField}
              tab={tab}
              settings={settings}
              allTags={allTags}
              onChange={onChange}
              onBrowse={onBrowse}
            />
          )}
        </div>
      </div>

      {/* Footer — keyboard hints */}
      <div className="flex items-center gap-5 px-6 py-2 border-t shrink-0 text-[11px] text-muted-foreground">
        <span><kbd className="font-mono">↑↓</kbd> Navigate</span>
        <span><kbd className="font-mono">←→</kbd> Adjust</span>
        <span><kbd className="font-mono">Enter</kbd> Toggle</span>
        <span><kbd className="font-mono">Q / E</kbd> Switch tab</span>
      </div>
    </div>
  )
}
