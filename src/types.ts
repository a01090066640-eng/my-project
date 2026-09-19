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

export type DataStatus = 'ok' | 'no_api_key' | 'error'

export interface QuarterFinancial {
  period: string
  revenue: number | null
  costOfSales: number | null
  sga: number | null
  operatingProfit: number | null
  netIncome: number | null
}

export interface InventoryPoint {
  period: string
  inventory: number | null
  inventoryToRevenue: number | null
}

export interface CashFlowPoint {
  period: string
  cfo: number | null
  cfi: number | null
  cff: number | null
  fcf: number | null
}

export interface CapexPoint {
  period: string
  revenue: number | null
  capex: number | null
  capexToRevenue: number | null
}

export interface TangibleAssetPoint {
  period: string
  tangibleAssets: number | null
  capex: number | null
}

export interface EmployeePoint {
  period: string
  male: number | null
  female: number | null
}

export interface OrderBacklogPoint {
  period: string
  backlogKrw100m: number
}

export interface OrderDisclosure {
  date: string
  title: string
  url: string
}

export interface InvestorFlowPoint {
  date: string
  foreignNet: number
  institutionNet: number
  individualNet: number
}

export interface ConsensusSeries {
  periods: string[]
  revenue: (number | null)[]
  operatingProfit: (number | null)[]
}

export interface PriceHistoryPoint {
  date: string
  close: number
}

export interface MarketCapPoint {
  date: string
  marketCap: number
}

export interface ValuationBandLevel {
  multiple: number
  value: number
}

export interface ValuationBand {
  base: number
  levels: ValuationBandLevel[]
}

export interface CompanyData {
  id: string
  name: string
  stockCode: string
  sector: string
  hasOrderBacklog: boolean
  financialsStatus: DataStatus
  financials: QuarterFinancial[]
  inventory: InventoryPoint[]
  cashFlow: CashFlowPoint[]
  capex: CapexPoint[]
  tangibleAssets: TangibleAssetPoint[]
  employees: EmployeePoint[]
  orderBacklog: OrderBacklogPoint[]
  orderDisclosuresStatus: DataStatus
  orderDisclosures: OrderDisclosure[]
  investorFlowStatus: DataStatus
  investorFlow: InvestorFlowPoint[]
  consensusStatus: DataStatus
  consensus: ConsensusSeries | null
  priceHistoryStatus: DataStatus
  priceHistory: PriceHistoryPoint[]
  marketCapHistory: MarketCapPoint[]
  perBand: ValuationBand | null
  pbrBand: ValuationBand | null
}

export interface CompanyDashboardData {
  generatedAt: string | null
  companies: CompanyData[]
}
