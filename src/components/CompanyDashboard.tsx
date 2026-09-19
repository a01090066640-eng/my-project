import { useState } from 'react'
import type { CompanyData } from '../types'
import {
  formatCount,
  formatEokwon,
  formatPeople,
  formatPercent,
  formatShares,
  formatWon,
  formatWonPerShare,
} from '../utils/format'
import { BarChart } from './charts/BarChart'
import { LineChart } from './charts/LineChart'
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
        <CostCompositionSection company={company} />
        <InventorySection company={company} />
        <CashFlowSection company={company} />
        <CapexSection company={company} />
        <TangibleAssetsSection company={company} />
        <EmployeesSection company={company} />
        <MarketCapSection company={company} />
        <ValuationBandSection
          company={company}
          band={company.perBand}
          title="PER 밴드 (12M 단순화)"
          unitFormat={formatWonPerShare}
        />
        <ValuationBandSection
          company={company}
          band={company.pbrBand}
          title="PBR 밴드 (12M 단순화)"
          unitFormat={formatWonPerShare}
        />
        <OrderBacklogSection company={company} />
        <OrderDisclosuresSection company={company} />
        <ConsensusSection company={company} />
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
            <table className="tabular w-full min-w-[320px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
                  <th className="py-1.5 pr-3 font-medium">기간</th>
                  <th className="py-1.5 pr-3 font-medium">재고자산</th>
                  <th className="py-1.5 font-medium">재고/매출 비율</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.period} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-1.5 pr-3 text-[var(--text-secondary)]">{r.period}</td>
                    <td className="py-1.5 pr-3 text-[var(--text-primary)]">{formatWon(r.inventory)}</td>
                    <td className="py-1.5 text-[var(--text-primary)]">{formatPercent(r.inventoryToRevenue)}</td>
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

function CostCompositionSection({ company }: { company: CompanyData }) {
  const rows = company.financials.filter((r) => r.costOfSales !== null || r.sga !== null)
  if (rows.length === 0) return null

  const stackSeries = [
    { key: 'costOfSales', label: '매출원가', color: 'var(--series-2)' },
    { key: 'sga', label: '판매비와관리비', color: 'var(--series-4)' },
    { key: 'operatingProfit', label: '영업이익', color: 'var(--series-3)' },
  ]

  return (
    <div>
      <SubsectionHeading icon="🧱" title="매출 구성 (매출원가·판관비·영업이익)" />
      <BarChart
        stacked
        series={stackSeries}
        lines={[{ key: 'revenue', label: '매출액', color: 'var(--series-1)' }]}
        data={rows.map((r) => ({
          label: r.period,
          values: { costOfSales: r.costOfSales, sga: r.sga, operatingProfit: r.operatingProfit, revenue: r.revenue },
        }))}
        formatValue={(v) => formatWon(v)}
      />
    </div>
  )
}

function CashFlowSection({ company }: { company: CompanyData }) {
  const rows = company.cashFlow
  if (rows.length === 0) return null

  const series = [
    { key: 'cfo', label: '영업CF', color: 'var(--series-1)' },
    { key: 'cfi', label: '투자CF', color: 'var(--series-2)' },
    { key: 'cff', label: '재무CF', color: 'var(--series-4)' },
  ]

  return (
    <div>
      <SubsectionHeading icon="💵" title="현금흐름" />
      <BarChart
        series={series}
        lines={[{ key: 'fcf', label: 'FCF', color: 'var(--series-3)' }]}
        data={rows.map((r) => ({ label: r.period, values: { cfo: r.cfo, cfi: r.cfi, cff: r.cff, fcf: r.fcf } }))}
        formatValue={(v) => formatWon(v)}
      />
      <div className="mt-3 overflow-x-auto">
        <table className="tabular w-full min-w-[420px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
              <th className="py-1.5 pr-3 font-medium">기간</th>
              <th className="py-1.5 pr-3 font-medium">영업CF</th>
              <th className="py-1.5 pr-3 font-medium">투자CF</th>
              <th className="py-1.5 pr-3 font-medium">재무CF</th>
              <th className="py-1.5 font-medium">FCF</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.period} className="border-b border-[var(--border)] last:border-0">
                <td className="py-1.5 pr-3 text-[var(--text-secondary)]">{r.period}</td>
                <td className="py-1.5 pr-3 text-[var(--text-primary)]">{formatWon(r.cfo)}</td>
                <td className="py-1.5 pr-3 text-[var(--text-primary)]">{formatWon(r.cfi)}</td>
                <td className="py-1.5 pr-3 text-[var(--text-primary)]">{formatWon(r.cff)}</td>
                <td className="py-1.5 text-[var(--text-primary)]">{formatWon(r.fcf)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CapexSection({ company }: { company: CompanyData }) {
  const rows = company.capex
  if (rows.length === 0) return null

  return (
    <div>
      <SubsectionHeading icon="🏗️" title="매출과 CAPEX" />
      <BarChart
        series={[
          { key: 'revenue', label: '매출액', color: 'var(--series-1)' },
          { key: 'capex', label: 'CAPEX', color: 'var(--series-2)' },
        ]}
        data={rows.map((r) => ({ label: r.period, values: { revenue: r.revenue, capex: r.capex === null ? null : Math.abs(r.capex) } }))}
        formatValue={(v) => formatWon(v)}
      />
      <div className="mt-3 overflow-x-auto">
        <table className="tabular w-full min-w-[360px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
              <th className="py-1.5 pr-3 font-medium">기간</th>
              <th className="py-1.5 pr-3 font-medium">CAPEX</th>
              <th className="py-1.5 font-medium">CAPEX/매출</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.period} className="border-b border-[var(--border)] last:border-0">
                <td className="py-1.5 pr-3 text-[var(--text-secondary)]">{r.period}</td>
                <td className="py-1.5 pr-3 text-[var(--text-primary)]">{formatWon(r.capex === null ? null : Math.abs(r.capex))}</td>
                <td className="py-1.5 text-[var(--text-primary)]">{formatPercent(r.capexToRevenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TangibleAssetsSection({ company }: { company: CompanyData }) {
  const rows = company.tangibleAssets
  if (rows.length === 0) return null

  return (
    <div>
      <SubsectionHeading icon="🏭" title="유형자산" />
      <BarChart
        series={[
          { key: 'tangibleAssets', label: '유형자산', color: 'var(--series-1)' },
          { key: 'capex', label: 'CAPEX', color: 'var(--series-4)' },
        ]}
        data={rows.map((r) => ({
          label: r.period,
          values: { tangibleAssets: r.tangibleAssets, capex: r.capex === null ? null : Math.abs(r.capex) },
        }))}
        formatValue={(v) => formatWon(v)}
        height={160}
      />
    </div>
  )
}

function EmployeesSection({ company }: { company: CompanyData }) {
  const rows = company.employees
  if (rows.length === 0) return null

  return (
    <div>
      <SubsectionHeading icon="👥" title="임직원 현황" />
      <BarChart
        stacked
        series={[
          { key: 'male', label: '남', color: 'var(--series-1)' },
          { key: 'female', label: '여', color: 'var(--series-4)' },
        ]}
        data={rows.map((r) => ({ label: r.period, values: { male: r.male, female: r.female } }))}
        formatValue={(v) => formatPeople(v)}
        height={160}
      />
      <div className="mt-3 overflow-x-auto">
        <table className="tabular w-full min-w-[320px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
              <th className="py-1.5 pr-3 font-medium">기간</th>
              <th className="py-1.5 pr-3 font-medium">남</th>
              <th className="py-1.5 pr-3 font-medium">여</th>
              <th className="py-1.5 font-medium">합계</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.period} className="border-b border-[var(--border)] last:border-0">
                <td className="py-1.5 pr-3 text-[var(--text-secondary)]">{r.period}</td>
                <td className="py-1.5 pr-3 text-[var(--text-primary)]">{formatCount(r.male)}</td>
                <td className="py-1.5 pr-3 text-[var(--text-primary)]">{formatCount(r.female)}</td>
                <td className="py-1.5 text-[var(--text-primary)]">
                  {formatCount(r.male !== null && r.female !== null ? r.male + r.female : null)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MarketCapSection({ company }: { company: CompanyData }) {
  const rows = company.marketCapHistory
  if (rows.length === 0) {
    return (
      <div>
        <SubsectionHeading icon="🏦" title="시가총액 추이" />
        <DataStatusNote status={company.priceHistoryStatus} />
        <p className="text-sm text-[var(--text-muted)]">표시할 시가총액 데이터가 없습니다.</p>
      </div>
    )
  }

  return (
    <div>
      <SubsectionHeading icon="🏦" title="시가총액 추이 (주간)" />
      <LineChart
        series={[{ key: 'marketCap', label: '시가총액', color: 'var(--series-1)' }]}
        data={rows.map((r) => ({ label: r.date.slice(2), values: { marketCap: r.marketCap } }))}
        formatValue={(v) => formatWon(v)}
      />
    </div>
  )
}

function ValuationBandSection({
  company,
  band,
  title,
  unitFormat,
}: {
  company: CompanyData
  band: CompanyData['perBand']
  title: string
  unitFormat: (v: number | null) => string
}) {
  const priceRows = company.priceHistory
  if (!band || priceRows.length === 0) return null

  const bandColors = ['var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--status-serious)', 'var(--status-critical)']

  return (
    <div>
      <SubsectionHeading icon="📐" title={title} />
      <p className="mb-2 text-xs text-[var(--text-muted)]">
        현재 EPS/BPS × 고정 배수로 계산한 단순화된 밴드입니다 — 분기별로 달라지는 실제 EPS/BPS를 반영한 것이 아니라
        참고용 수평선입니다.
      </p>
      <LineChart
        series={[{ key: 'close', label: '수정주가(주간)', color: 'var(--series-1)' }]}
        data={priceRows.map((r) => ({ label: r.date.slice(2), values: { close: r.close } }))}
        formatValue={(v) => unitFormat(v)}
        referenceLines={band.levels.map((l, i) => ({
          label: `${l.multiple}x`,
          value: l.value,
          color: bandColors[i % bandColors.length],
        }))}
      />
    </div>
  )
}

function OrderDisclosuresSection({ company }: { company: CompanyData }) {
  const rows = company.orderDisclosures
  return (
    <div>
      <SubsectionHeading icon="📰" title="수주공시 (단일판매·공급계약체결)" />
      {rows.length === 0 ? (
        <>
          <DataStatusNote status={company.orderDisclosuresStatus} />
          <p className="text-sm text-[var(--text-muted)]">최근 공시된 단일판매·공급계약체결 건이 없습니다.</p>
        </>
      ) : (
        <div className="overflow-x-auto">
          <table className="tabular w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
                <th className="py-1.5 pr-3 font-medium">공시일</th>
                <th className="py-1.5 pr-3 font-medium">제목</th>
                <th className="py-1.5 font-medium">원문</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.date}-${r.title}`} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-1.5 pr-3 text-[var(--text-secondary)]">{r.date}</td>
                  <td className="py-1.5 pr-3 text-[var(--text-primary)]">{r.title}</td>
                  <td className="py-1.5">
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-[var(--status-info)] underline">
                      DART
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ConsensusSection({ company }: { company: CompanyData }) {
  const consensus = company.consensus
  if (!consensus) {
    return (
      <div>
        <SubsectionHeading icon="🔮" title="컨센서스 (매출·영업이익 추정)" />
        <DataStatusNote status={company.consensusStatus} />
        <p className="text-sm text-[var(--text-muted)]">표시할 컨센서스 데이터가 없습니다.</p>
      </div>
    )
  }

  return (
    <div>
      <SubsectionHeading icon="🔮" title="컨센서스 (매출·영업이익 추정, 억원)" />
      <div className="overflow-x-auto">
        <table className="tabular w-full min-w-[420px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
              <th className="py-1.5 pr-3 font-medium">기간</th>
              {consensus.periods.map((p) => (
                <th key={p} className="py-1.5 pr-3 font-medium">
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[var(--border)]">
              <td className="py-1.5 pr-3 text-[var(--text-secondary)]">매출액</td>
              {consensus.revenue.map((v, i) => (
                <td key={i} className="py-1.5 pr-3 text-[var(--text-primary)]">
                  {formatEokwon(v)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-1.5 pr-3 text-[var(--text-secondary)]">영업이익</td>
              {consensus.operatingProfit.map((v, i) => (
                <td key={i} className="py-1.5 pr-3 text-[var(--text-primary)]">
                  {formatEokwon(v)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
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
