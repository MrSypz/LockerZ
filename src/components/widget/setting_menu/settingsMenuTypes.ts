import type { Settings } from '@/types/file'

export type IconName =
  | 'chevronLeft'
  | 'chevronRight'
  | 'reset'
  | 'folder'
  | 'display'
  | 'shield'
  | 'close'

export type TabId = 'general' | 'display' | 'content'

export type TabConfig = {
  id: TabId
  labelKey: string
  icon: IconName
}

export type SettingOption = {
  value: string
  label: string
}

type FieldBase = {
  id: string
  tab: TabId
  titleKey: string
  descriptionKey: string
  hintKey?: string
  defaultValue?: unknown
}

export type RangeField = FieldBase & {
  control: 'range'
  min: number
  max: number
  step: number
  getValue: (s: Settings) => number
  toPatch: (v: number) => Partial<Settings>
  format: (v: number) => string
}

export type ToggleField = FieldBase & {
  control: 'toggle'
  getValue: (s: Settings) => boolean
  toPatch: (v: boolean) => Partial<Settings>
}

export type OptionField = FieldBase & {
  control: 'option'
  options: readonly SettingOption[]
  getValue: (s: Settings) => string
  toPatch: (v: string) => Partial<Settings>
}

export type FilepathField = FieldBase & {
  control: 'filepath'
  getValue: (s: Settings) => string
  toPatch: (v: string) => Partial<Settings>
}

export type TagsField = FieldBase & {
  control: 'tags'
  getValue: (s: Settings) => string[]
  toPatch: (v: string[]) => Partial<Settings>
}

export type TextField = FieldBase & {
  control: 'text'
  placeholder?: string
  getValue: (s: Settings) => string
  toPatch: (v: string) => Partial<Settings>
}

export type SettingField = RangeField | ToggleField | OptionField | FilepathField | TagsField | TextField
