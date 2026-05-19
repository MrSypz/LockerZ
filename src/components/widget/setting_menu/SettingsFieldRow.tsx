import { useTranslation } from 'react-i18next'
import SettingsMenuIcon from './SettingsMenuIcon'
import type { Settings } from '@/types/file'
import type { SettingField } from './settingsMenuTypes'
import { cn } from '@/lib/utils'

interface SettingsFieldRowProps {
  field: SettingField
  settings: Settings
  active: boolean
  onKeyboardFocus: (id: string) => void
  onPointerFocus: (id: string) => void
}

export default function SettingsFieldRow({ field, settings, active, onKeyboardFocus, onPointerFocus }: SettingsFieldRowProps) {
  const { t } = useTranslation()
  const label = t(field.titleKey, { defaultValue: field.id })

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "flex items-center justify-between px-3 py-2.5 rounded-md cursor-pointer select-none transition-colors text-sm",
        active
          ? "bg-primary/15 text-foreground ring-1 ring-primary/30"
          : "hover:bg-muted text-foreground",
      )}
      onMouseEnter={() => onPointerFocus(field.id)}
      onFocus={() => onKeyboardFocus(field.id)}
      onClick={() => onPointerFocus(field.id)}
    >
      <span className="font-medium">{label}</span>

      <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
        {field.control === 'range' && (
          <>
            <SettingsMenuIcon name="chevronLeft" className="opacity-40" />
            <div className="relative w-20 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
                style={{ width: `${((field.getValue(settings) - field.min) / (field.max - field.min)) * 100}%` }}
              />
            </div>
            <span className="w-12 text-right text-xs tabular-nums">{field.format(field.getValue(settings))}</span>
            <SettingsMenuIcon name="chevronRight" className="opacity-40" />
          </>
        )}

        {field.control === 'toggle' && (
          <>
            <SettingsMenuIcon name="chevronLeft" className="opacity-40" />
            <span className={cn(
              "text-xs font-semibold w-8 text-center",
              field.getValue(settings) ? "text-primary" : "text-muted-foreground",
            )}>
              {field.getValue(settings) ? 'On' : 'Off'}
            </span>
            <SettingsMenuIcon name="chevronRight" className="opacity-40" />
          </>
        )}

        {field.control === 'option' && (
          <>
            <SettingsMenuIcon name="chevronLeft" className="opacity-40" />
            <span className="text-xs w-16 text-center truncate">
              {field.options.find(o => o.value === field.getValue(settings))?.label ?? field.getValue(settings)}
            </span>
            <SettingsMenuIcon name="chevronRight" className="opacity-40" />
          </>
        )}

        {field.control === 'filepath' && (
          <span className="text-xs max-w-40 truncate text-right font-mono opacity-50">
            {field.getValue(settings) || '—'}
          </span>
        )}

        {field.control === 'tags' && (
          <span className={cn(
            "text-xs font-medium",
            field.getValue(settings).length > 0 ? "text-amber-400" : "text-muted-foreground",
          )}>
            {field.getValue(settings).length} active
          </span>
        )}
      </div>
    </div>
  )
}
