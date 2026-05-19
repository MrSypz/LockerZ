import { useTranslation } from 'react-i18next'
import { FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Settings } from '@/types/file'
import type { SettingField, TabId, TagsField } from './settingsMenuTypes'
import { cn } from '@/lib/utils'

function SensitiveChip({ name, field, settings, onChange }: {
  name: string
  field: TagsField
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
}) {
  const active = field.getValue(settings).includes(name)
  return (
    <button
      type="button"
      onClick={() => {
        const current = field.getValue(settings)
        const next = active ? current.filter(t => t !== name) : [...current, name]
        onChange(field.toPatch(next))
      }}
      className={cn(
        "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
        active
          ? "bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30"
          : "bg-transparent text-muted-foreground border-border hover:bg-muted hover:text-foreground",
      )}
    >
      {name}
    </button>
  )
}

interface SettingsDetailsPanelProps {
  field: SettingField
  tab: TabId
  settings: Settings
  allTags: string[]
  allCategories: string[]
  onChange: (patch: Partial<Settings>) => void
  onBrowse: () => void
}

export default function SettingsDetailsPanel({ field, tab, settings, allTags, allCategories, onChange, onBrowse }: SettingsDetailsPanelProps) {
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
        <div className="space-y-5">
          {allTags.length === 0 && allCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No tags or categories yet. Add tags to your images first, then return here to mark any as sensitive.
            </p>
          ) : (
            <>
              {allTags.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Tags</div>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map(tag => <SensitiveChip key={tag} name={tag} field={field} settings={settings} onChange={onChange} />)}
                  </div>
                </div>
              )}
              {allCategories.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Categories</div>
                  <div className="flex flex-wrap gap-2">
                    {allCategories.map(cat => <SensitiveChip key={cat} name={cat} field={field} settings={settings} onChange={onChange} />)}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Highlighted items blur matching images in safe mode. Categories blur all images in that folder.
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
