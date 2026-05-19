import type { ReactNode } from 'react'
import type { IconName } from './settingsMenuTypes'

interface SettingsMenuIconProps {
  name: IconName
  className?: string
}

export default function SettingsMenuIcon({ name, className = '' }: SettingsMenuIconProps) {
  const common = {
    width: '1em',
    height: '1em',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  }

  const paths: Record<IconName, ReactNode> = {
    chevronLeft: <path d="M15 18l-6-6 6-6" />,
    chevronRight: <path d="M9 6l6 6-6 6" />,
    reset: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
      </>
    ),
    folder: (
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    ),
    display: (
      <>
        <rect x="3" y="4" width="18" height="12" rx="1.5" />
        <path d="M8 21h8M12 16v5" />
      </>
    ),
    shield: (
      <path d="M12 2 4 5.5v6C4 15.8 7.5 19.7 12 22c4.5-2.3 8-6.2 8-10.5v-6L12 2z" />
    ),
    close: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
  }

  return <svg {...common}>{paths[name]}</svg>
}
