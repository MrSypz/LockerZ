import { useTranslation } from 'react-i18next'
import { FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Settings } from '@/types/file'
import type { SettingField, TabId } from './settingsMenuTypes'
import { cn } from '@/lib/utils'

interface SettingsDetailsPanelProps {
  field: SettingField
  tab: TabId
  settings: Settings
  allTags: string[]
  onChange: (patch: Partial<Settings>) => void
  onBrowse: () => void
}

export default function SettingsDetailsPanel({ field, tab, settings, allTags, onChange, onBrowse }: SettingsDetailsPanelProps) {
  const { t } = useTranslation()
  const title = t(field.titleKey, { defaultValue: field.id })
  const description = t(field.descriptionKey, { defaultValue: '' })
  const hint = field.hintKey ? t(field.hintKey, { defaultValue: '' }) : null

  const tabLabel = t(`settings.tab.${tab}`, { defaultValue: tab })

  return (
    <aside className="flex flex-col gap-5 p-6 h-full">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">
          {tabLabel}
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{description}</p>
        )}
        {hint && (
          <p className="text-xs text-muted-foreground/60 mt-2 italic">{hint}</p>
        )}
      </div>

      {field.control === 'filepath' && (
        <div className="space-y-3">
          <div className="text-xs font-mono bg-muted/50 border rounded-md px-3 py-2.5 break-all text-muted-foreground leading-relaxed">
            {field.getValue(settings) || '—'}
          </div>
          <Button size="sm" variant="outline" onClick={onBrowse} className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Browse Folder
          </Button>
        </div>
      )}

      {field.control === 'tags' && (
        <div className="space-y-4">
          {allTags.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No tags in your library yet. Tag your images first, then return here to mark any as sensitive.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => {
                  const active = field.getValue(settings).includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const current = field.getValue(settings)
                        const next = active
                          ? current.filter(t => t !== tag)
                          : [...current, tag]
                        onChange(field.toPatch(next))
                      }}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                        active
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30"
                          : "bg-transparent text-muted-foreground border-border hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Highlighted tags will blur matching images when safe mode is on. Toggle safe mode in the sidebar.
              </p>
            </>
          )}
        </div>
      )}

      {field.control === 'range' && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{field.format(field.min)}</span>
            <span className="text-foreground font-semibold tabular-nums text-base">
              {field.format(field.getValue(settings))}
            </span>
            <span>{field.format(field.max)}</span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
              style={{ width: `${((field.getValue(settings) - field.min) / (field.max - field.min)) * 100}%` }}
            />
          </div>
        </div>
      )}
    </aside>
  )
}
