import type { ActionItem } from '../types'
import { SectionCard } from './SectionCard'
import { severityMeta } from './severity'

interface ActionNeededProps {
  items: ActionItem[]
}

export function ActionNeeded({ items }: ActionNeededProps) {
  return (
    <SectionCard
      icon="🔔"
      title="지금 해야 할 것"
      right={
        <span className="rounded-full bg-[var(--status-serious)]/15 px-2.5 py-1 text-xs font-semibold text-[var(--status-serious)]">
          조치 필요 {items.length}건
        </span>
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">
          지금 조치가 필요한 항목이 없습니다.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const meta = severityMeta[item.severity]
            return (
              <li
                key={item.id}
                className="rounded-xl border border-[var(--border)] p-4"
                style={{ background: meta.bg }}
              >
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <span aria-hidden>{meta.icon}</span>
                  <span>
                    {item.category} — {item.title}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
                  최신 <span className="tabular font-medium">{item.latestDate}</span> (
                  {item.staleness}) · 원본 공표 {item.sourceSchedule} · 담당 잡{' '}
                  <code className="rounded bg-[var(--surface-0)] px-1 py-0.5 text-[11px]">
                    {item.jobName}
                  </code>
                  은 {item.jobStatus} — {item.note}
                </p>
                {item.command && (
                  <pre className="tabular mt-2 overflow-x-auto rounded-lg bg-[var(--surface-0)] px-3 py-2 text-[11px] text-[var(--text-secondary)]">
                    {item.command}
                  </pre>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </SectionCard>
  )
}
