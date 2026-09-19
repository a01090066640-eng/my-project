interface HeaderProps {
  title: string
  subtitle: string
  generatedAt: string
  dataMode: 'live' | 'sample'
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export function Header({
  title,
  subtitle,
  generatedAt,
  dataMode,
  theme,
  onToggleTheme,
}: HeaderProps) {
  return (
    <header className="flex flex-col gap-1 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            {title}
          </h1>
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={
              dataMode === 'live'
                ? {
                    color: 'var(--status-good)',
                    background: 'color-mix(in oklab, var(--status-good) 14%, transparent)',
                  }
                : {
                    color: 'var(--status-info)',
                    background: 'color-mix(in oklab, var(--status-info) 14%, transparent)',
                  }
            }
          >
            {dataMode === 'live' ? '🟢 실시간 데이터' : '🔵 샘플 데이터'}
          </span>
        </div>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-[var(--text-muted)]">{generatedAt} 기준</span>
        <button
          type="button"
          onClick={onToggleTheme}
          className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          {theme === 'light' ? '🌙 다크모드' : '☀️ 라이트모드'}
        </button>
      </div>
    </header>
  )
}
