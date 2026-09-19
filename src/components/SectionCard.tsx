import type { ReactNode } from 'react'

interface SectionCardProps {
  icon: string
  title: string
  description?: string
  right?: ReactNode
  children: ReactNode
}

export function SectionCard({ icon, title, description, right, children }: SectionCardProps) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)] sm:text-lg">
            <span aria-hidden>{icon}</span>
            {title}
          </h2>
          {description && (
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--text-muted)]">
              {description}
            </p>
          )}
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}
