import { languages } from '@/lib/lang'
import type { Settings } from '@/types/file'
import type { SettingField, TabConfig, TabId } from './settingsMenuTypes'

export const SETTINGS_TABS: TabConfig[] = [
  { id: 'general', labelKey: 'settings.tab.general', icon: 'folder' },
  { id: 'display', labelKey: 'settings.tab.display', icon: 'display' },
  { id: 'content', labelKey: 'settings.tab.content', icon: 'shield' },
]

const LANGUAGE_OPTIONS = Object.values(languages).map(lang => ({
  value: lang.code,
  label: lang.label,
}))

export const SETTINGS_FIELDS: SettingField[] = [
  // General
  {
    id: 'folderPath',
    tab: 'general',
    control: 'filepath',
    titleKey: 'settings.rootFolder.title',
    descriptionKey: 'settings.rootFolder.description',
    getValue: (s) => s.folderPath ?? '',
    toPatch: (v) => ({ folderPath: v }),
  },
  {
    id: 'lang',
    tab: 'general',
    control: 'option',
    titleKey: 'settings.languageSettings.language',
    descriptionKey: 'settings.languageSettings.description',
    defaultValue: 'en',
    options: LANGUAGE_OPTIONS,
    getValue: (s) => s.lang ?? 'en',
    toPatch: (v) => ({ lang: v }),
  },
  {
    id: 'rememberCategory',
    tab: 'general',
    control: 'toggle',
    titleKey: 'settings.lockerSettings.rememberCategory',
    descriptionKey: 'settings.lockerSettings.description',
    defaultValue: false,
    getValue: (s) => s.rememberCategory ?? false,
    toPatch: (v) => ({ rememberCategory: v }),
  },
  // Display
  {
    id: 'imageQuality',
    tab: 'display',
    control: 'range',
    titleKey: 'settings.lockerSettings.imageQuality',
    descriptionKey: 'settings.lockerSettings.imageQuality.description',
    defaultValue: 75,
    min: 1, max: 100, step: 1,
    getValue: (s) => s.imageQuality ?? 75,
    toPatch: (v) => ({ imageQuality: v }),
    format: (v) => `${v}%`,
  },
  {
    id: 'imageWidth',
    tab: 'display',
    control: 'range',
    titleKey: 'settings.lockerSettings.imageWidth',
    descriptionKey: 'settings.lockerSettings.imageWidth.description',
    defaultValue: 250,
    min: 100, max: 800, step: 10,
    getValue: (s) => s.imageWidth ?? 250,
    toPatch: (v) => ({ imageWidth: v }),
    format: (v) => `${v}px`,
  },
  {
    id: 'imageHeight',
    tab: 'display',
    control: 'range',
    titleKey: 'settings.lockerSettings.imageHeight',
    descriptionKey: 'settings.lockerSettings.imageHeight.description',
    defaultValue: 400,
    min: 250, max: 1200, step: 10,
    getValue: (s) => s.imageHeight ?? 400,
    toPatch: (v) => ({ imageHeight: v }),
    format: (v) => `${v}px`,
  },
  {
    id: 'batch_process',
    tab: 'display',
    control: 'range',
    titleKey: 'settings.lockerSettings.batchprocess',
    descriptionKey: 'settings.lockerSettings.batchprocess.description',
    defaultValue: 20,
    min: 1, max: 255, step: 1,
    getValue: (s) => s.batch_process ?? 20,
    toPatch: (v) => ({ batch_process: v }),
    format: (v) => `${v}`,
  },
  // Content
  {
    id: 'sensitive_tags',
    tab: 'content',
    control: 'tags',
    titleKey: 'settings.sensitiveContent.title',
    descriptionKey: 'settings.sensitiveContent.description',
    defaultValue: ['explicit'],
    getValue: (s) => s.sensitive_tags ?? [],
    toPatch: (v) => ({ sensitive_tags: v }),
  },
]

export function firstFieldIdForTab(tab: TabId): string {
  return SETTINGS_FIELDS.find(f => f.tab === tab)?.id ?? 'folderPath'
}

export function resetSettingsPatch(fields: SettingField[]): Partial<Settings> {
  const patch: Record<string, unknown> = {}
  for (const field of fields) {
    if (field.defaultValue !== undefined && field.control !== 'filepath') {
      patch[field.id] = field.defaultValue
    }
  }
  return patch as Partial<Settings>
}
