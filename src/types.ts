export type Severity = 'critical' | 'serious' | 'info' | 'good'

export type Cadence = '일간' | '주간' | '월간' | '분기'

export interface DashboardMeta {
  title: string
  subtitle: string
  generatedAt: string
  dataMode: 'live' | 'sample'
}

export interface ActionItem {
  id: string
  severity: Severity
  category: string
  title: string
  latestDate: string
  staleness: string
  sourceSchedule: string
  jobName: string
  jobStatus: string
  note: string
  command?: string
}

export interface UpdateEntry {
  id: string
  category: string
  title: string
  latestLabel: string
  updatedLabel: string
}

export interface NotableIndicator {
  id: string
  category: string
  severity: Severity
  title: string
  value: string
  asOf: string
  updatedAsOf?: string
  detail: string
}

export interface EvidenceRef {
  category: string
  label: string
  value: string
  asOf: string
}

export interface InvestmentIdea {
  id: string
  tier: 'good' | 'watch'
  ticker: string
  name: string
  market: string
  sector: string
  thesis: string
  reasoning: string
  evidence: EvidenceRef[]
}

export interface CategoryStatus {
  id: string
  name: string
  icon: string
  status: 'ok' | 'delayed'
  total: number
  cadenceBreakdown: string
  delayedCount?: number
  delayedNote?: string
}
