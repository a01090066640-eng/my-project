import { useState } from 'react'
import type { UpdateEntry } from '../types'
import { SectionCard } from './SectionCard'

interface RecentUpdatesProps {
  groups: { cadence: string; count: number; items: UpdateEntry[] }[]
}

export function RecentUpdates({ groups }: RecentUpdatesProps) {
  const [openCadence, setOpenCadence] = useState<string | null>(groups[0]?.cadence ?? null)

  return (
    <SectionCard
      icon="📅"
      title="최근 업데이트"
      description="원장 내용이 실제로 바뀐 것만 뜹니다 — 수집기가 같은 값을 다시 써서 파일 시각만 바뀐 건 제외합니다."
    >
      <div className="flex flex-col gap-3">
        {groups.map((group) => {
          const isOpen = openCadence === group.cadence
          return (
            <div key={group.cadence} className="rounded-xl border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setOpenCadence(isOpen ? null : group.cadence)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)]"
              >
                <span>
                  {group.cadence} — {group.count}건
                </span>
                <span className="text-[var(--text-muted)]">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <ul className="flex flex-col gap-2 border-t border-[var(--border)] px-4 py-3">
                  {group.items.map((item) => (
                    <li key={item.id} className="text-sm text-[var(--text-secondary)]">
                      <span className="text-[var(--text-muted)]">{item.category}</span>
                      <span className="mx-1.5">·</span>
                      <span className="text-[var(--text-primary)]">{item.title}</span>
                      <span className="mx-1.5">—</span>
                      최신 <code className="tabular">{item.latestLabel}</code>
                      <span className="mx-1"> (갱신 </span>
                      <code className="tabular">{item.updatedLabel}</code>)
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}
