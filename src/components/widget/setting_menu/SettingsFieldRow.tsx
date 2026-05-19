import { useTranslation } from 'react-i18next'
import SettingsMenuIcon from './SettingsMenuIcon'
import type { Settings } from '@/types/file'
import type { OptionField, RangeField, SettingField, TextField, ToggleField } from './settingsMenuTypes'
import { cycleOption } from './settingsMenuUtils'
import { cn } from '@/lib/utils'

interface SettingsFieldRowProps {
  field: SettingField
  settings: Settings
  active: boolean
  onKeyboardFocus: (id: string) => void
  onPointerFocus: (id: string) => void
  onChange: (patch: Partial<Settings>) => void
}

export default function SettingsFieldRow({ field, settings, active, onKeyboardFocus, onPointerFocus, onChange }: SettingsFieldRowProps) {
  const { t } = useTranslation()
  const label = t(field.titleKey, { defaultValue: field.id })

  const handleRowClick = () => {
    onPointerFocus(field.id)
  }

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
      onClick={handleRowClick}
    >
      <span className="font-medium">{label}</span>

      <div className="flex items-center gap-1 text-muted-foreground shrink-0">
        {field.control === 'range' && (
          <>
            <div className="relative w-20 h-1.5 bg-muted rounded-full overflow-hidden mx-1">
              <div
                className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
                style={{ width: `${(((field as RangeField).getValue(settings) - (field as RangeField).min) / ((field as RangeField).max - (field as RangeField).min)) * 100}%` }}
              />
            </div>
            <span className="w-12 text-right text-xs tabular-nums">
              {(field as RangeField).format((field as RangeField).getValue(settings))}
            </span>
          </>
        )}

        {field.control === 'toggle' && (
          <span className={cn(
            "text-xs font-semibold w-8 text-center",
            (field as ToggleField).getValue(settings) ? "text-primary" : "text-muted-foreground",
          )}>
            {(field as ToggleField).getValue(settings) ? 'On' : 'Off'}
          </span>
        )}

        {field.control === 'option' && (
          <>
            <button
              type="button"
              className="p-0.5 rounded hover:bg-muted-foreground/10 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                onPointerFocus(field.id)
                onChange((field as OptionField).toPatch(
                  cycleOption((field as OptionField).options, (field as OptionField).getValue(settings), -1)
                ))
              }}
            >
              <SettingsMenuIcon name="chevronLeft" />
            </button>
            <span className="text-xs w-16 text-center truncate">
              {(field as OptionField).options.find(o => o.value === (field as OptionField).getValue(settings))?.label ?? (field as OptionField).getValue(settings)}
            </span>
            <button
              type="button"
              className="p-0.5 rounded hover:bg-muted-foreground/10 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                onPointerFocus(field.id)
                onChange((field as OptionField).toPatch(
                  cycleOption((field as OptionField).options, (field as OptionField).getValue(settings), 1)
                ))
              }}
            >
              <SettingsMenuIcon name="chevronRight" />
            </button>
          </>
        )}

        {field.control === 'filepath' && (
          <span className="text-xs max-w-40 truncate text-right font-mono opacity-50">
            {(field as { getValue: (s: Settings) => string }).getValue(settings) || '—'}
          </span>
        )}

        {field.control === 'tags' && (
          <span className={cn(
            "text-xs font-medium",
            (field as { getValue: (s: Settings) => string[] }).getValue(settings).length > 0 ? "text-amber-400" : "text-muted-foreground",
          )}>
            {(field as { getValue: (s: Settings) => string[] }).getValue(settings).length} active
          </span>
        )}

        {field.control === 'text' && (
          <span className="text-xs max-w-32 truncate text-right text-muted-foreground">
            {(field as TextField).getValue(settings) || '—'}
          </span>
        )}
      </div>
    </div>
  )
}
