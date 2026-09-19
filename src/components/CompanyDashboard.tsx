import { useState } from 'react'
import type { CompanyData } from '../types'
import { formatEokwon, formatShares, formatWon } from '../utils/format'
import { BarChart } from './charts/BarChart'
import { SectionCard } from './SectionCard'

interface CompanyDashboardProps {
  companies: CompanyData[]
  generatedAt: string | null
  isLive: boolean
}

function DataStatusNote({ status }: { status: CompanyData['financialsStatus'] }) {
  if (status === 'ok') return null
  const text =
    status === 'no_api_key'
      ? 'DART API 키가 설정되지 않아 자동 수집을 건너뛰었습니다 (샘플 데이터 표시 중)'
      : '데이터 수집 중 오류가 발생했습니다 (샘플 데이터 표시 중)'
  return <p className="mb-2 text-xs text-[var(--status-serious)]">⚠️ {text}</p>
}

export function CompanyDashboard({ companies, generatedAt, isLive }: CompanyDashboardProps) {
  const [activeId, setActiveId] = useState(companies[0]?.id)
  const company = companies.find((c) => c.id === activeId) ?? companies[0]

  if (!company) return null

  return (
    <SectionCard
      icon="📈"
      title="관심기업 실적·수급"
      description="실적(매출·영업이익·순이익), 재고자산, 수주잔고, 수급(외국인·기관·개인 순매매)을 자동으로 갱신합니다."
      right={
        <span className="text-xs text-[var(--text-muted)]">
          {isLive && generatedAt ? `갱신: ${generatedAt}` : '샘플 데이터'}
        </span>
      }
    >
      <div role="tablist" aria-label="기업 선택" className="mb-5 flex flex-wrap gap-1.5">
        {companies.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={c.id === company.id}
            onClick={() => setActiveId(c.id)}
            className={
              'rounded-full border px-3 py-1.5 text-sm transition-colors ' +
              (c.id === company.id
                ? 'border-[var(--series-1)] bg-[color-mix(in_oklab,var(--series-1)_14%,transparent)] font-medium text-[var(--text-primary)]'
                : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-0)]')
            }
          >
            {c.name}
            <span className="ml-1.5 text-[11px] text-[var(--text-muted)]">{c.stockCode}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        <FinancialsSection company={company} />
        <InventorySection company={company} />
        <OrderBacklogSection company={company} />
        <InvestorFlowSection company={company} />
      </div>
    </SectionCard>
  )
}

function SubsectionHeading({ icon, title, sector }: { icon: string; title: string; sector?: string }) {
  return (
    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
      <span aria-hidden>{icon}</span>
      {title}
      {sector && <span className="text-xs font-normal text-[var(--text-muted)]">· {sector}</span>}
    </h3>
  )
}

function FinancialsSection({ company }: { company: CompanyData }) {
  const rows = company.financials
  if (rows.length === 0) {
    return (
      <div>
        <SubsectionHeading icon="💰" title="실적 (매출·영업이익·순이익)" />
        <DataStatusNote status={company.financialsStatus} />
        <p className="text-sm text-[var(--text-muted)]">표시할 실적 데이터가 없습니다.</p>
      </div>
    )
  }

  const series = [
    { key: 'revenue', label: '매출액', color: 'var(--series-1)' },
    { key: 'operatingProfit', label: '영업이익', color: 'var(--series-2)' },
    { key: 'netIncome', label: '당기순이익', color: 'var(--series-3)' },
  ]

  return (
    <div>
      <SubsectionHeading icon="💰" title="실적 (매출·영업이익·순이익)" />
      <DataStatusNote status={company.financialsStatus} />
      <BarChart
        series={series}
        data={rows.map((r) => ({ label: r.period, values: { revenue: r.revenue, operatingProfit: r.operatingProfit, netIncome: r.netIncome } }))}
        formatValue={(v) => formatWon(v)}
      />
      <div className="mt-3 overflow-x-auto">
        <table className="tabular w-full min-w-[420px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
              <th className="py-1.5 pr-3 font-medium">기간</th>
              <th className="py-1.5 pr-3 font-medium">매출액</th>
              <th className="py-1.5 pr-3 font-medium">영업이익</th>
              <th className="py-1.5 font-medium">당기순이익</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.period} className="border-b border-[var(--border)] last:border-0">
                <td className="py-1.5 pr-3 text-[var(--text-secondary)]">{r.period}</td>
                <td className="py-1.5 pr-3 text-[var(--text-primary)]">{formatWon(r.revenue)}</td>
                <td className="py-1.5 pr-3 text-[var(--text-primary)]">{formatWon(r.operatingProfit)}</td>
                <td className="py-1.5 text-[var(--text-primary)]">{formatWon(r.netIncome)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function InventorySection({ company }: { company: CompanyData }) {
  const rows = company.inventory
  return (
    <div>
      <SubsectionHeading icon="📦" title="재고자산" />
      {rows.length === 0 ? (
        <>
          <DataStatusNote status={company.financialsStatus} />
          <p className="text-sm text-[var(--text-muted)]">표시할 재고자산 데이터가 없습니다.</p>
        </>
      ) : (
        <>
          <BarChart
            series={[{ key: 'inventory', label: '재고자산', color: 'var(--series-1)' }]}
            data={rows.map((r) => ({ label: r.period, values: { inventory: r.inventory } }))}
            formatValue={(v) => formatWon(v)}
            height={160}
          />
          <div className="mt-3 overflow-x-auto">
            <table className="tabular w-full min-w-[280px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
                  <th className="py-1.5 pr-3 font-medium">기간</th>
                  <th className="py-1.5 font-medium">재고자산</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.period} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-1.5 pr-3 text-[var(--text-secondary)]">{r.period}</td>
                    <td className="py-1.5 text-[var(--text-primary)]">{formatWon(r.inventory)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function OrderBacklogSection({ company }: { company: CompanyData }) {
  if (!company.hasOrderBacklog) {
    return (
      <div>
        <SubsectionHeading icon="📋" title="수주잔고" />
        <p className="text-sm text-[var(--text-muted)]">
          이 종목은 수주잔고를 정기적으로 공시하는 업종(조선·건설·방산 등)이 아니라 N/A로 표시합니다.
        </p>
      </div>
    )
  }

  const rows = company.orderBacklog
  return (
    <div>
      <SubsectionHeading icon="📋" title="수주잔고" sector={company.sector} />
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          아직 수주잔고 값이 입력되지 않았습니다 (pipeline/config/order_backlog.json을 채워주세요).
        </p>
      ) : (
        <>
          <BarChart
            series={[{ key: 'backlog', label: '수주잔고', color: 'var(--series-2)' }]}
            data={rows.map((r) => ({ label: r.period, values: { backlog: r.backlogKrw100m } }))}
            formatValue={(v) => formatEokwon(v)}
            height={160}
          />
          <div className="mt-3 overflow-x-auto">
            <table className="tabular w-full min-w-[280px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
                  <th className="py-1.5 pr-3 font-medium">기간</th>
                  <th className="py-1.5 font-medium">수주잔고</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.period} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-1.5 pr-3 text-[var(--text-secondary)]">{r.period}</td>
                    <td className="py-1.5 text-[var(--text-primary)]">{formatEokwon(r.backlogKrw100m)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function InvestorFlowSection({ company }: { company: CompanyData }) {
  const rows = company.investorFlow
  if (rows.length === 0) {
    return (
      <div>
        <SubsectionHeading icon="🔀" title="수급 분석 (외국인·기관·개인 순매매)" />
        <DataStatusNote status={company.investorFlowStatus} />
        <p className="text-sm text-[var(--text-muted)]">표시할 수급 데이터가 없습니다.</p>
      </div>
    )
  }

  const series = [
    { key: 'foreignNet', label: '외국인', color: 'var(--series-1)' },
    { key: 'institutionNet', label: '기관', color: 'var(--series-2)' },
    { key: 'individualNet', label: '개인', color: 'var(--series-3)' },
  ]

  return (
    <div>
      <SubsectionHeading icon="🔀" title="수급 분석 (외국인·기관·개인 순매매)" />
      <DataStatusNote status={company.investorFlowStatus} />
      <BarChart
        series={series}
        data={rows.map((r) => ({
          label: r.date.slice(5),
          values: { foreignNet: r.foreignNet, institutionNet: r.institutionNet, individualNet: r.individualNet },
        }))}
        formatValue={(v) => formatShares(v)}
      />
      <div className="mt-3 max-h-64 overflow-y-auto overflow-x-auto">
        <table className="tabular w-full min-w-[420px] text-left text-sm">
          <thead className="sticky top-0 bg-[var(--surface-1)]">
            <tr className="border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
              <th className="py-1.5 pr-3 font-medium">날짜</th>
              <th className="py-1.5 pr-3 font-medium">외국인 순매매</th>
              <th className="py-1.5 pr-3 font-medium">기관 순매매</th>
              <th className="py-1.5 font-medium">개인 순매매</th>
            </tr>
          </thead>
          <tbody>
            {[...rows].reverse().map((r) => (
              <tr key={r.date} className="border-b border-[var(--border)] last:border-0">
                <td className="py-1.5 pr-3 text-[var(--text-secondary)]">{r.date}</td>
                <td
                  className="py-1.5 pr-3"
                  style={{ color: r.foreignNet >= 0 ? 'var(--success-text)' : 'var(--status-critical)' }}
                >
                  {formatShares(r.foreignNet)}
                </td>
                <td
                  className="py-1.5 pr-3"
                  style={{ color: r.institutionNet >= 0 ? 'var(--success-text)' : 'var(--status-critical)' }}
                >
                  {formatShares(r.institutionNet)}
                </td>
                <td
                  className="py-1.5"
                  style={{ color: r.individualNet >= 0 ? 'var(--success-text)' : 'var(--status-critical)' }}
                >
                  {formatShares(r.individualNet)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
