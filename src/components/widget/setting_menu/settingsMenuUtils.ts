import type { SettingOption } from './settingsMenuTypes'

export function cycleOption(options: readonly SettingOption[], value: string, direction: number) {
  const index = Math.max(0, options.findIndex((option) => option.value === value))
  return options[(index + direction + options.length) % options.length].value
}
