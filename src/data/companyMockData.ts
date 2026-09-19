// Sample data shown until the pipeline has actually run with a DART_API_KEY
// (see pipeline/fetch_company_data.py). Numbers are illustrative, not real
// disclosures — order of magnitude only, so the dashboard never looks empty
// while wired to real data. Derived fields (cost split, cash flow, CAPEX,
// price history, valuation bands, ...) are computed deterministically from
// a small per-company spec below rather than hand-typed, so the shape stays
// consistent with what the real pipeline produces.
import type { CompanyData, InvestorFlowPoint, OrderDisclosure, PriceHistoryPoint, ValuationBand } from '../types'

const PERIODS = ['2024 연간', '2025 1Q 누적', '2025 반기 누적', '2025 3Q 누적']
const PER_MULTIPLES = [7, 9, 10, 15, 20]
const PBR_MULTIPLES = [1, 1.25, 1.5, 1.7, 2]

interface BaseFinancial {
  period: string
  revenue: number
  operatingProfit: number
  netIncome: number
  inventory: number
}

interface CompanySpec {
  id: string
  name: string
  stockCode: string
  sector: string
  hasOrderBacklog: boolean
  financials: BaseFinancial[]
  equity: number
  sharesOutstanding: number
  basePrice: number
  priceAmpPct: number
  foreignAmp: number
  instAmp: number
  orderBacklog?: { period: string; backlogKrw100m: number }[]
}

// Deterministic (no Math.random) so the sample dashboard renders identically
// every time — a small day-index-driven wave, not real trading data.
function sampleFlow(baseDate: string, days: number, foreignAmp: number, instAmp: number): InvestorFlowPoint[] {
  const start = new Date(`${baseDate}T00:00:00Z`)
  const out: InvestorFlowPoint[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setUTCDate(d.getUTCDate() + i)
    const foreignNet = Math.round(Math.sin(i * 0.7) * foreignAmp)
    const institutionNet = Math.round(Math.cos(i * 0.5) * instAmp)
    const individualNet = -(foreignNet + institutionNet)
    out.push({ date: d.toISOString().slice(0, 10), foreignNet, institutionNet, individualNet })
  }
  return out
}

function samplePriceHistory(weeks: number, basePrice: number, ampPct: number): PriceHistoryPoint[] {
  const start = new Date('2026-01-05T00:00:00Z')
  const out: PriceHistoryPoint[] = []
  for (let i = 0; i < weeks; i++) {
    const d = new Date(start)
    d.setUTCDate(d.getUTCDate() + i * 7)
    const drift = (i / weeks) * ampPct * 0.6
    const wave = Math.sin(i * 0.4) * ampPct * 0.25
    const close = Math.round(basePrice * (1 + (drift + wave) / 100))
    out.push({ date: d.toISOString().slice(0, 10), close })
  }
  return out
}

function buildValuationBand(base: number | null, multiples: number[]): ValuationBand | null {
  if (!base) return null
  return { base, levels: multiples.map((multiple) => ({ multiple, value: Math.round(base * multiple * 100) / 100 })) }
}

function sampleOrderDisclosures(name: string, hasOrderBacklog: boolean): OrderDisclosure[] {
  if (!hasOrderBacklog) return []
  return [
    { date: '2025-07-31', title: `[샘플] ${name} 단일판매ㆍ공급계약체결`, url: 'https://dart.fss.or.kr' },
    { date: '2025-04-15', title: `[샘플] ${name} 단일판매ㆍ공급계약체결`, url: 'https://dart.fss.or.kr' },
  ]
}

function buildCompany(spec: CompanySpec): CompanyData {
  const financials = spec.financials.map((f) => ({
    period: f.period,
    revenue: f.revenue,
    costOfSales: Math.round(f.revenue * 0.62),
    sga: Math.round(f.revenue * 0.14),
    operatingProfit: f.operatingProfit,
    netIncome: f.netIncome,
  }))

  const inventory = spec.financials.map((f) => ({
    period: f.period,
    inventory: f.inventory,
    inventoryToRevenue: Math.round((f.inventory / f.revenue) * 1000) / 1000,
  }))

  const cashFlow = spec.financials.map((f) => {
    const cfo = Math.round(f.operatingProfit * 1.15)
    const capex = Math.round(-f.operatingProfit * 0.55)
    return {
      period: f.period,
      cfo,
      cfi: Math.round(-f.operatingProfit * 0.9),
      cff: Math.round(-f.operatingProfit * 0.2),
      fcf: cfo + capex,
    }
  })

  const capex = spec.financials.map((f) => {
    const capexValue = Math.round(-f.operatingProfit * 0.55)
    return {
      period: f.period,
      revenue: f.revenue,
      capex: capexValue,
      capexToRevenue: Math.round((Math.abs(capexValue) / f.revenue) * 1000) / 1000,
    }
  })

  const tangibleAssets = spec.financials.map((f, i) => ({
    period: f.period,
    tangibleAssets: Math.round(spec.equity * 0.45 * (1 + i * 0.02)),
    capex: capex[i].capex,
  }))

  const employees = spec.financials.map((f, i) => {
    const base = Math.round(spec.sharesOutstanding / 40000) + i * 50
    return { period: f.period, male: Math.round(base * 0.62), female: Math.round(base * 0.38) }
  })

  const lastFinancial = spec.financials[spec.financials.length - 1]
  const consensus = {
    periods: ['2024', '2025(E)', '2026(E)', '2027(E)'],
    revenue: [
      Math.round((spec.financials[0].revenue / 1e8) * 10) / 10,
      Math.round((lastFinancial.revenue * 1.35 / 1e8) * 10) / 10,
      Math.round((lastFinancial.revenue * 1.55 / 1e8) * 10) / 10,
      Math.round((lastFinancial.revenue * 1.7 / 1e8) * 10) / 10,
    ],
    operatingProfit: [
      Math.round((spec.financials[0].operatingProfit / 1e8) * 10) / 10,
      Math.round((lastFinancial.operatingProfit * 1.5 / 1e8) * 10) / 10,
      Math.round((lastFinancial.operatingProfit * 1.8 / 1e8) * 10) / 10,
      Math.round((lastFinancial.operatingProfit * 2.0 / 1e8) * 10) / 10,
    ],
  }

  const priceHistory = samplePriceHistory(40, spec.basePrice, spec.priceAmpPct)
  const marketCapHistory = priceHistory.map((p) => ({ date: p.date, marketCap: p.close * spec.sharesOutstanding }))

  const eps = Math.round((lastFinancial.netIncome / spec.sharesOutstanding) * 100) / 100
  const bps = Math.round((spec.equity / spec.sharesOutstanding) * 100) / 100

  return {
    id: spec.id,
    name: spec.name,
    stockCode: spec.stockCode,
    sector: spec.sector,
    hasOrderBacklog: spec.hasOrderBacklog,
    financialsStatus: 'ok',
    financials,
    inventory,
    cashFlow,
    capex,
    tangibleAssets,
    employees,
    orderBacklog: spec.orderBacklog ?? [],
    orderDisclosuresStatus: 'ok',
    orderDisclosures: sampleOrderDisclosures(spec.name, spec.hasOrderBacklog),
    investorFlowStatus: 'ok',
    investorFlow: sampleFlow('2026-09-01', 14, spec.foreignAmp, spec.instAmp),
    consensusStatus: 'ok',
    consensus,
    priceHistoryStatus: 'ok',
    priceHistory,
    marketCapHistory,
    perBand: buildValuationBand(eps, PER_MULTIPLES),
    pbrBand: buildValuationBand(bps, PBR_MULTIPLES),
  }
}

export const companyDashboardMeta = {
  generatedAt: null as string | null,
}

const SPECS: CompanySpec[] = [
  {
    id: 'samsung-electronics',
    name: '삼성전자',
    stockCode: '005930',
    sector: '반도체/전자',
    hasOrderBacklog: false,
    equity: 400_000_000_000_000,
    sharesOutstanding: 5_969_782_550,
    basePrice: 85_000,
    priceAmpPct: 45,
    foreignAmp: 850_000,
    instAmp: 420_000,
    financials: [
      { period: PERIODS[0], revenue: 300_870_000_000_000, operatingProfit: 32_730_000_000_000, netIncome: 34_450_000_000_000, inventory: 52_240_000_000_000 },
      { period: PERIODS[1], revenue: 79_140_000_000_000, operatingProfit: 6_610_000_000_000, netIncome: 8_310_000_000_000, inventory: 54_680_000_000_000 },
      { period: PERIODS[2], revenue: 158_760_000_000_000, operatingProfit: 14_890_000_000_000, netIncome: 17_540_000_000_000, inventory: 56_120_000_000_000 },
      { period: PERIODS[3], revenue: 240_120_000_000_000, operatingProfit: 26_450_000_000_000, netIncome: 29_870_000_000_000, inventory: 55_390_000_000_000 },
    ],
  },
  {
    id: 'sk-hynix',
    name: 'SK하이닉스',
    stockCode: '000660',
    sector: '반도체',
    hasOrderBacklog: false,
    equity: 120_000_000_000_000,
    sharesOutstanding: 728_002_365,
    basePrice: 220_000,
    priceAmpPct: 60,
    foreignAmp: 610_000,
    instAmp: 380_000,
    financials: [
      { period: PERIODS[0], revenue: 66_190_000_000_000, operatingProfit: 23_470_000_000_000, netIncome: 19_760_000_000_000, inventory: 7_820_000_000_000 },
      { period: PERIODS[1], revenue: 17_640_000_000_000, operatingProfit: 7_440_000_000_000, netIncome: 6_190_000_000_000, inventory: 8_140_000_000_000 },
      { period: PERIODS[2], revenue: 36_570_000_000_000, operatingProfit: 16_120_000_000_000, netIncome: 13_580_000_000_000, inventory: 8_310_000_000_000 },
      { period: PERIODS[3], revenue: 57_310_000_000_000, operatingProfit: 26_780_000_000_000, netIncome: 22_140_000_000_000, inventory: 8_050_000_000_000 },
    ],
  },
  {
    id: 'hd-hyundai-heavy',
    name: 'HD현대중공업',
    stockCode: '329180',
    sector: '조선',
    hasOrderBacklog: true,
    equity: 9_500_000_000_000,
    sharesOutstanding: 79_311_296,
    basePrice: 450_000,
    priceAmpPct: 90,
    foreignAmp: 120_000,
    instAmp: 65_000,
    orderBacklog: [
      { period: PERIODS[0], backlogKrw100m: 396_000 },
      { period: PERIODS[1], backlogKrw100m: 421_000 },
      { period: PERIODS[2], backlogKrw100m: 445_000 },
      { period: PERIODS[3], backlogKrw100m: 458_000 },
    ],
    financials: [
      { period: PERIODS[0], revenue: 13_120_000_000_000, operatingProfit: 621_000_000_000, netIncome: 438_000_000_000, inventory: 2_610_000_000_000 },
      { period: PERIODS[1], revenue: 3_480_000_000_000, operatingProfit: 198_000_000_000, netIncome: 142_000_000_000, inventory: 2_740_000_000_000 },
      { period: PERIODS[2], revenue: 7_150_000_000_000, operatingProfit: 412_000_000_000, netIncome: 296_000_000_000, inventory: 2_890_000_000_000 },
      { period: PERIODS[3], revenue: 10_960_000_000_000, operatingProfit: 655_000_000_000, netIncome: 471_000_000_000, inventory: 2_950_000_000_000 },
    ],
  },
  {
    id: 'hanwha-aerospace',
    name: '한화에어로스페이스',
    stockCode: '012450',
    sector: '방산',
    hasOrderBacklog: true,
    equity: 8_200_000_000_000,
    sharesOutstanding: 55_657_360,
    basePrice: 750_000,
    priceAmpPct: 110,
    foreignAmp: 95_000,
    instAmp: 48_000,
    orderBacklog: [
      { period: PERIODS[0], backlogKrw100m: 292_000 },
      { period: PERIODS[1], backlogKrw100m: 305_000 },
      { period: PERIODS[2], backlogKrw100m: 318_000 },
      { period: PERIODS[3], backlogKrw100m: 331_000 },
    ],
    financials: [
      { period: PERIODS[0], revenue: 11_270_000_000_000, operatingProfit: 890_000_000_000, netIncome: 612_000_000_000, inventory: 1_420_000_000_000 },
      { period: PERIODS[1], revenue: 2_610_000_000_000, operatingProfit: 231_000_000_000, netIncome: 168_000_000_000, inventory: 1_510_000_000_000 },
      { period: PERIODS[2], revenue: 5_420_000_000_000, operatingProfit: 498_000_000_000, netIncome: 351_000_000_000, inventory: 1_580_000_000_000 },
      { period: PERIODS[3], revenue: 8_390_000_000_000, operatingProfit: 812_000_000_000, netIncome: 574_000_000_000, inventory: 1_630_000_000_000 },
    ],
  },
  {
    id: 'hyundai-eng-const',
    name: '현대건설',
    stockCode: '000720',
    sector: '건설',
    hasOrderBacklog: true,
    equity: 7_600_000_000_000,
    sharesOutstanding: 76_071_764,
    basePrice: 62_000,
    priceAmpPct: 55,
    foreignAmp: 70_000,
    instAmp: 55_000,
    orderBacklog: [
      { period: PERIODS[0], backlogKrw100m: 342_000 },
      { period: PERIODS[1], backlogKrw100m: 338_000 },
      { period: PERIODS[2], backlogKrw100m: 351_000 },
      { period: PERIODS[3], backlogKrw100m: 349_000 },
    ],
    financials: [
      { period: PERIODS[0], revenue: 29_850_000_000_000, operatingProfit: 610_000_000_000, netIncome: 398_000_000_000, inventory: 980_000_000_000 },
      { period: PERIODS[1], revenue: 7_460_000_000_000, operatingProfit: 152_000_000_000, netIncome: 101_000_000_000, inventory: 1_020_000_000_000 },
      { period: PERIODS[2], revenue: 15_120_000_000_000, operatingProfit: 318_000_000_000, netIncome: 214_000_000_000, inventory: 1_060_000_000_000 },
      { period: PERIODS[3], revenue: 22_780_000_000_000, operatingProfit: 486_000_000_000, netIncome: 327_000_000_000, inventory: 1_040_000_000_000 },
    ],
  },
]

export const companies: CompanyData[] = SPECS.map(buildCompany)
