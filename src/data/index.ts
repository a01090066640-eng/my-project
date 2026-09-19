// Bridges the pipeline's generated `liveData.json` (see pipeline/build_dashboard_data.py)
// with the hand-written sample data in `mockData.ts`. Until the pipeline's GitHub
// Action has run at least once, `liveData.json` is an empty seed and the dashboard
// falls back to the sample data so the UI is never blank.
import liveDataRaw from './liveData.json'
import * as mock from './mockData'
import type {
  ActionItem,
  CategoryStatus,
  DashboardMeta,
  InvestmentIdea,
  NotableIndicator,
  UpdateEntry,
} from '../types'

interface LiveData {
  dashboardMeta: DashboardMeta
  actionItems: ActionItem[]
  recentUpdates: { cadence: string; count: number; items: UpdateEntry[] }[]
  notableIndicators: { category: string; items: NotableIndicator[] }[]
  investmentIdeas: InvestmentIdea[]
  categoryStatuses: CategoryStatus[]
  totals: {
    totalIndicators: number
    delayedIndicators: number
    notableCount: { critical: number; serious: number; info: number; total: number }
  }
}

// `as unknown as LiveData`, not a direct `as LiveData`: the pipeline's JSON output
// varies run to run (fields that are `null` some days and a number other days, empty
// arrays vs populated ones), so TypeScript's structural-overlap check on JSON module
// types will periodically reject a direct assertion even though the shape is fine at
// runtime. Going through `unknown` is the standard escape hatch for "trust me" on
// externally-produced data — see pipeline/build_dashboard_data.py for the real shape
// contract this file relies on.
const live = liveDataRaw as unknown as LiveData
const hasLiveData = live.categoryStatuses.length > 0

export const dashboardMeta: DashboardMeta = hasLiveData ? live.dashboardMeta : mock.dashboardMeta
export const actionItems: ActionItem[] = hasLiveData ? live.actionItems : mock.actionItems
export const recentUpdates = hasLiveData ? live.recentUpdates : mock.recentUpdates
export const notableIndicators = hasLiveData ? live.notableIndicators : mock.notableIndicators
export const investmentIdeas: InvestmentIdea[] = hasLiveData
  ? live.investmentIdeas
  : mock.investmentIdeas
export const categoryStatuses: CategoryStatus[] = hasLiveData
  ? live.categoryStatuses
  : mock.categoryStatuses
export const totals = hasLiveData ? live.totals : mock.totals
