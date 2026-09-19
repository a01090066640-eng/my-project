import type { NotableIndicator } from '../types'
import { SectionCard } from './SectionCard'
import { severityMeta } from './severity'

interface NotableIndicatorsProps {
  groups: { category: string; items: NotableIndicator[] }[]
  totals: { critical: number; serious: number; info: number; total: number }
}

export function NotableIndicators({ groups, totals }: NotableIndicatorsProps) {
  return (
    <SectionCard
      icon="⭐"
      title="오늘의 주목할만한 지표"
      description="전체 카테고리의 추적 지표를 훑어 임계치를 넘은 것만 자동으로 올립니다. 걸리는 게 없으면 비웁니다 — 억지로 채우지 않습니다."
      right={
        <span className="tabular text-xs text-[var(--text-secondary)]">
          🔴 {totals.critical} · 🟠 {totals.serious} · 🔵 {totals.info} · 총 {totals.total}건
        </span>
      }
    >
      <div className="flex flex-col gap-5">
        {groups.map((group) => (
          <div key={group.category}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
              {severityMeta[group.items[0]?.severity ?? 'info'].icon} {group.category} —{' '}
              {group.items.length}건
            </h3>
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {group.items.map((item) => {
                const meta = severityMeta[item.severity]
                return (
                  <li
                    key={item.id}
                    className="rounded-lg border border-[var(--border)] px-3.5 py-3"
                    style={{ background: meta.bg }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {meta.icon} {item.title}
                      </span>
                      <span className="whitespace-nowrap text-[11px] text-[var(--text-muted)]">
                        📅 {item.asOf}
                        {item.updatedAsOf && ` (갱신 ${item.updatedAsOf})`}
                      </span>
                    </div>
                    <p
                      className="tabular mt-1 text-sm font-semibold"
                      style={{ color: meta.color }}
                    >
                      {item.value}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.detail}</p>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
