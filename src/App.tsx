import { useEffect, useState } from 'react'
import { ActionNeeded } from './components/ActionNeeded'
import { CategoryStatusGrid } from './components/CategoryStatusGrid'
import { Header } from './components/Header'
import { InvestmentIdeas } from './components/InvestmentIdeas'
import { NotableIndicators } from './components/NotableIndicators'
import { RecentUpdates } from './components/RecentUpdates'
import {
  actionItems,
  categoryStatuses,
  dashboardMeta,
  investmentIdeas,
  notableIndicators,
  recentUpdates,
  totals,
} from './data/mockData'

type Theme = 'light' | 'dark'

function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem('dashboard-theme') as Theme) ?? 'light'
    } catch {
      return 'light'
    }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('dashboard-theme', theme)
    } catch {
      // ignore - private mode / blocked storage
    }
  }, [theme])

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <Header
        title={dashboardMeta.title}
        subtitle={dashboardMeta.subtitle}
        generatedAt={dashboardMeta.generatedAt}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
      />
      <ActionNeeded items={actionItems} />
      <RecentUpdates groups={recentUpdates} />
      <NotableIndicators groups={notableIndicators} totals={totals.notableCount} />
      <InvestmentIdeas ideas={investmentIdeas} />
      <CategoryStatusGrid
        categories={categoryStatuses}
        totalIndicators={totals.totalIndicators}
        delayedIndicators={totals.delayedIndicators}
      />
      <footer className="pb-4 pt-2 text-center text-xs text-[var(--text-muted)]">
        샘플 데이터로 구성된 대시보드입니다 · 실제 데이터 소스는 이후 연결 예정
      </footer>
    </div>
  )
}

export default App
