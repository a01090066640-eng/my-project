import { useEffect, useState } from 'react'
import { ActionNeeded } from './components/ActionNeeded'
import { CategoryStatusGrid } from './components/CategoryStatusGrid'
import { CompanyDashboard } from './components/CompanyDashboard'
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
} from './data'
import { companies as companyList, companyDashboardGeneratedAt, isCompanyDataLive } from './data/companyIndex'

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
        dataMode={dashboardMeta.dataMode}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
      />
      {actionItems.length > 0 && <ActionNeeded items={actionItems} />}
      {companyList.length > 0 && (
        <CompanyDashboard
          companies={companyList}
          generatedAt={companyDashboardGeneratedAt}
          isLive={isCompanyDataLive}
        />
      )}
      <RecentUpdates groups={recentUpdates} />
      <NotableIndicators groups={notableIndicators} totals={totals.notableCount} />
      {investmentIdeas.length > 0 && <InvestmentIdeas ideas={investmentIdeas} />}
      <CategoryStatusGrid
        categories={categoryStatuses}
        totalIndicators={totals.totalIndicators}
        delayedIndicators={totals.delayedIndicators}
      />
      <footer className="pb-4 pt-2 text-center text-xs text-[var(--text-muted)]">
        {dashboardMeta.dataMode === 'live'
          ? '파이프라인이 매일 자동으로 수집한 실데이터입니다'
          : '샘플 데이터로 구성된 대시보드입니다 · 파이프라인이 처음 실행되면 실데이터로 교체됩니다'}
      </footer>
    </div>
  )
}

export default App
