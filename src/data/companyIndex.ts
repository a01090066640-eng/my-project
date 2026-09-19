// Same live/mock fallback pattern as `index.ts`: until the company pipeline
// has run with a DART_API_KEY, `companyData.json` is an empty seed and the
// dashboard falls back to the illustrative sample data in companyMockData.ts.
import companyDataRaw from './companyData.json'
import * as mock from './companyMockData'
import type { CompanyData, CompanyDashboardData } from '../types'

const live = companyDataRaw as unknown as CompanyDashboardData
const hasLiveData = live.companies.length > 0

export const companyDashboardGeneratedAt: string | null = hasLiveData
  ? live.generatedAt
  : mock.companyDashboardMeta.generatedAt

export const companies: CompanyData[] = hasLiveData ? live.companies : mock.companies

export const isCompanyDataLive = hasLiveData
