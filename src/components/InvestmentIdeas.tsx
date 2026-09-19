import type { InvestmentIdea } from '../types'
import { SectionCard } from './SectionCard'

interface InvestmentIdeasProps {
  ideas: InvestmentIdea[]
}

const tierMeta = {
  good: { icon: '🟢', ring: 'var(--status-good)' },
  watch: { icon: '🟡', ring: 'var(--status-warning)' },
}

export function InvestmentIdeas({ ideas }: InvestmentIdeasProps) {
  return (
    <SectionCard
      icon="⭐"
      title="오늘의 투자아이디어"
      description="주목할만한 지표를 근거로, 추적 유니버스에 이미 들어 있는 종목 중 오늘 들여다볼 만한 곳을 골라 올립니다. 목표주가·매매의견은 내지 않습니다."
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {ideas.map((idea) => {
          const meta = tierMeta[idea.tier]
          return (
            <article
              key={idea.id}
              className="rounded-xl border border-[var(--border)] p-4"
              style={{ borderLeft: `3px solid ${meta.ring}` }}
            >
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span aria-hidden>{meta.icon}</span>
                <span className="font-semibold text-[var(--text-primary)]">{idea.name}</span>
                <span className="tabular text-xs text-[var(--text-muted)]">({idea.ticker})</span>
                <span className="text-xs text-[var(--text-muted)]">
                  · {idea.market}/{idea.sector}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-[var(--text-secondary)]">
                — {idea.thesis}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                {idea.reasoning}
              </p>
              <ul className="mt-3 flex flex-col gap-1 border-t border-[var(--border)] pt-2">
                {idea.evidence.map((ev, i) => (
                  <li key={i} className="text-[11px] text-[var(--text-muted)]">
                    ↳ ({ev.category}) {ev.label} · <span className="tabular font-medium text-[var(--text-secondary)]">{ev.value}</span> · 📅 {ev.asOf}
                  </li>
                ))}
              </ul>
            </article>
          )
        })}
      </div>
    </SectionCard>
  )
}
