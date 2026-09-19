import type { Severity } from '../types'

export const severityMeta: Record<
  Severity,
  { icon: string; label: string; color: string; bg: string }
> = {
  critical: { icon: '🔴', label: '긴급', color: 'var(--status-critical)', bg: 'color-mix(in oklab, var(--status-critical) 12%, transparent)' },
  serious: { icon: '🟠', label: '주의', color: 'var(--status-serious)', bg: 'color-mix(in oklab, var(--status-serious) 14%, transparent)' },
  info: { icon: '🔵', label: '참고', color: 'var(--status-info)', bg: 'color-mix(in oklab, var(--status-info) 12%, transparent)' },
  good: { icon: '🟢', label: '정상', color: 'var(--status-good)', bg: 'color-mix(in oklab, var(--status-good) 12%, transparent)' },
}
