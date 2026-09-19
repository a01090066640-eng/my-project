// Sample data shown until the pipeline has actually run with a DART_API_KEY
// (see pipeline/fetch_company_data.py). Numbers are illustrative, not real
// disclosures — order of magnitude only, so the dashboard never looks empty
// while wired to real data.
import type { CompanyData, InvestorFlowPoint } from '../types'

const PERIODS = ['2024 연간', '2025 1Q 누적', '2025 반기 누적', '2025 3Q 누적']

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
    out.push({
      date: d.toISOString().slice(0, 10),
      foreignNet,
      institutionNet,
      individualNet,
    })
  }
  return out
}

export const companyDashboardMeta = {
  generatedAt: null as string | null,
}

export const companies: CompanyData[] = [
  {
    id: 'samsung-electronics',
    name: '삼성전자',
    stockCode: '005930',
    sector: '반도체/전자',
    hasOrderBacklog: false,
    financialsStatus: 'ok',
    financials: [
      { period: PERIODS[0], revenue: 300_870_000_000_000, operatingProfit: 32_730_000_000_000, netIncome: 34_450_000_000_000 },
      { period: PERIODS[1], revenue: 79_140_000_000_000, operatingProfit: 6_610_000_000_000, netIncome: 8_310_000_000_000 },
      { period: PERIODS[2], revenue: 158_760_000_000_000, operatingProfit: 14_890_000_000_000, netIncome: 17_540_000_000_000 },
      { period: PERIODS[3], revenue: 240_120_000_000_000, operatingProfit: 26_450_000_000_000, netIncome: 29_870_000_000_000 },
    ],
    inventory: [
      { period: PERIODS[0], inventory: 52_240_000_000_000 },
      { period: PERIODS[1], inventory: 54_680_000_000_000 },
      { period: PERIODS[2], inventory: 56_120_000_000_000 },
      { period: PERIODS[3], inventory: 55_390_000_000_000 },
    ],
    orderBacklog: [],
    investorFlowStatus: 'ok',
    investorFlow: sampleFlow('2026-09-01', 14, 850_000, 420_000),
  },
  {
    id: 'sk-hynix',
    name: 'SK하이닉스',
    stockCode: '000660',
    sector: '반도체',
    hasOrderBacklog: false,
    financialsStatus: 'ok',
    financials: [
      { period: PERIODS[0], revenue: 66_190_000_000_000, operatingProfit: 23_470_000_000_000, netIncome: 19_760_000_000_000 },
      { period: PERIODS[1], revenue: 17_640_000_000_000, operatingProfit: 7_440_000_000_000, netIncome: 6_190_000_000_000 },
      { period: PERIODS[2], revenue: 36_570_000_000_000, operatingProfit: 16_120_000_000_000, netIncome: 13_580_000_000_000 },
      { period: PERIODS[3], revenue: 57_310_000_000_000, operatingProfit: 26_780_000_000_000, netIncome: 22_140_000_000_000 },
    ],
    inventory: [
      { period: PERIODS[0], inventory: 7_820_000_000_000 },
      { period: PERIODS[1], inventory: 8_140_000_000_000 },
      { period: PERIODS[2], inventory: 8_310_000_000_000 },
      { period: PERIODS[3], inventory: 8_050_000_000_000 },
    ],
    orderBacklog: [],
    investorFlowStatus: 'ok',
    investorFlow: sampleFlow('2026-09-01', 14, 610_000, 380_000),
  },
  {
    id: 'hd-hyundai-heavy',
    name: 'HD현대중공업',
    stockCode: '329180',
    sector: '조선',
    hasOrderBacklog: true,
    financialsStatus: 'ok',
    financials: [
      { period: PERIODS[0], revenue: 13_120_000_000_000, operatingProfit: 621_000_000_000, netIncome: 438_000_000_000 },
      { period: PERIODS[1], revenue: 3_480_000_000_000, operatingProfit: 198_000_000_000, netIncome: 142_000_000_000 },
      { period: PERIODS[2], revenue: 7_150_000_000_000, operatingProfit: 412_000_000_000, netIncome: 296_000_000_000 },
      { period: PERIODS[3], revenue: 10_960_000_000_000, operatingProfit: 655_000_000_000, netIncome: 471_000_000_000 },
    ],
    inventory: [
      { period: PERIODS[0], inventory: 2_610_000_000_000 },
      { period: PERIODS[1], inventory: 2_740_000_000_000 },
      { period: PERIODS[2], inventory: 2_890_000_000_000 },
      { period: PERIODS[3], inventory: 2_950_000_000_000 },
    ],
    orderBacklog: [
      { period: PERIODS[0], backlogKrw100m: 396_000 },
      { period: PERIODS[1], backlogKrw100m: 421_000 },
      { period: PERIODS[2], backlogKrw100m: 445_000 },
      { period: PERIODS[3], backlogKrw100m: 458_000 },
    ],
    investorFlowStatus: 'ok',
    investorFlow: sampleFlow('2026-09-01', 14, 120_000, 65_000),
  },
  {
    id: 'hanwha-aerospace',
    name: '한화에어로스페이스',
    stockCode: '012450',
    sector: '방산',
    hasOrderBacklog: true,
    financialsStatus: 'ok',
    financials: [
      { period: PERIODS[0], revenue: 11_270_000_000_000, operatingProfit: 890_000_000_000, netIncome: 612_000_000_000 },
      { period: PERIODS[1], revenue: 2_610_000_000_000, operatingProfit: 231_000_000_000, netIncome: 168_000_000_000 },
      { period: PERIODS[2], revenue: 5_420_000_000_000, operatingProfit: 498_000_000_000, netIncome: 351_000_000_000 },
      { period: PERIODS[3], revenue: 8_390_000_000_000, operatingProfit: 812_000_000_000, netIncome: 574_000_000_000 },
    ],
    inventory: [
      { period: PERIODS[0], inventory: 1_420_000_000_000 },
      { period: PERIODS[1], inventory: 1_510_000_000_000 },
      { period: PERIODS[2], inventory: 1_580_000_000_000 },
      { period: PERIODS[3], inventory: 1_630_000_000_000 },
    ],
    orderBacklog: [
      { period: PERIODS[0], backlogKrw100m: 292_000 },
      { period: PERIODS[1], backlogKrw100m: 305_000 },
      { period: PERIODS[2], backlogKrw100m: 318_000 },
      { period: PERIODS[3], backlogKrw100m: 331_000 },
    ],
    investorFlowStatus: 'ok',
    investorFlow: sampleFlow('2026-09-01', 14, 95_000, 48_000),
  },
  {
    id: 'hyundai-eng-const',
    name: '현대건설',
    stockCode: '000720',
    sector: '건설',
    hasOrderBacklog: true,
    financialsStatus: 'ok',
    financials: [
      { period: PERIODS[0], revenue: 29_850_000_000_000, operatingProfit: 610_000_000_000, netIncome: 398_000_000_000 },
      { period: PERIODS[1], revenue: 7_460_000_000_000, operatingProfit: 152_000_000_000, netIncome: 101_000_000_000 },
      { period: PERIODS[2], revenue: 15_120_000_000_000, operatingProfit: 318_000_000_000, netIncome: 214_000_000_000 },
      { period: PERIODS[3], revenue: 22_780_000_000_000, operatingProfit: 486_000_000_000, netIncome: 327_000_000_000 },
    ],
    inventory: [
      { period: PERIODS[0], inventory: 980_000_000_000 },
      { period: PERIODS[1], inventory: 1_020_000_000_000 },
      { period: PERIODS[2], inventory: 1_060_000_000_000 },
      { period: PERIODS[3], inventory: 1_040_000_000_000 },
    ],
    orderBacklog: [
      { period: PERIODS[0], backlogKrw100m: 342_000 },
      { period: PERIODS[1], backlogKrw100m: 338_000 },
      { period: PERIODS[2], backlogKrw100m: 351_000 },
      { period: PERIODS[3], backlogKrw100m: 349_000 },
    ],
    investorFlowStatus: 'ok',
    investorFlow: sampleFlow('2026-09-01', 14, 70_000, 55_000),
  },
]
