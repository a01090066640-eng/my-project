// Shared number formatters for the company dashboard. Kept separate from
// components so both charts and tables format identically.

export function formatWon(value: number | null): string {
  if (value === null) return '—'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(1)}조원`
  if (abs >= 1e8) return `${sign}${Math.round(abs / 1e8).toLocaleString()}억원`
  return `${sign}${abs.toLocaleString()}원`
}

/** value is already in 억원 (100-million-won) units, as disclosed by 수주현황 reports. */
export function formatEokwon(value: number | null): string {
  if (value === null) return '—'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(1)}조원`
  return `${sign}${Math.round(abs).toLocaleString()}억원`
}

export function formatShares(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  const abs = Math.abs(value)
  if (abs >= 1e4) return `${sign}${(abs / 1e4).toFixed(1)}만주`
  return `${sign}${abs.toLocaleString()}주`
}
