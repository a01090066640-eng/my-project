import type { CategoryStatus } from '../types'
import { SectionCard } from './SectionCard'

interface CategoryStatusGridProps {
  categories: CategoryStatus[]
  totalIndicators: number
  delayedIndicators: number
}

export function CategoryStatusGrid({
  categories,
  totalIndicators,
  delayedIndicators,
}: CategoryStatusGridProps) {
  return (
    <SectionCard
      icon="🗓"
      title="카테고리별 갱신 현황"
      description={`🟢 정상 · 🟠 지연 — 지표 ${totalIndicators}개 중 ${delayedIndicators}개 지연. 최신 시점은 스펙이 아니라 실제 데이터에서 읽습니다.`}
    >
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((cat) => {
          const isDelayed = cat.status === 'delayed'
          return (
            <div
              key={cat.id}
              className="rounded-lg border border-[var(--border)] px-3 py-2.5"
              style={
                isDelayed
                  ? { background: 'color-mix(in oklab, var(--status-serious) 12%, transparent)' }
                  : undefined
              }
            >
              <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]">
                <span aria-hidden>{isDelayed ? '🟠' : '🟢'}</span>
                <span aria-hidden>{cat.icon}</span>
                <span>{cat.name}</span>
                <span className="tabular ml-auto text-xs text-[var(--text-muted)]">
                  {cat.total}개
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">{cat.cadenceBreakdown}</p>
              {isDelayed && cat.delayedNote && (
                <p className="mt-1 text-[11px] font-medium text-[var(--status-serious)]">
                  지연: {cat.delayedNote}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}
