interface HeaderProps {
  title: string
  subtitle: string
  generatedAt: string
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export function Header({ title, subtitle, generatedAt, theme, onToggleTheme }: HeaderProps) {
  return (
    <header className="flex flex-col gap-1 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          {title}
        </h1>
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
