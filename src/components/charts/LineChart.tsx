import { useId, useState } from 'react'

export interface LineSeries {
  key: string
  label: string
  color: string
  dashed?: boolean
}

export interface LineChartDatum {
  label: string
  values: Record<string, number | null>
}

export interface ReferenceLine {
  label: string
  value: number
  color?: string
}

interface LineChartProps {
  series: LineSeries[]
  data: LineChartDatum[]
  formatValue: (value: number) => string
  height?: number
  referenceLines?: ReferenceLine[]
  maxXTicks?: number
}

const MARGIN = { top: 8, right: 56, bottom: 24, left: 8 }

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min]
  const step = (max - min) / count
  return Array.from({ length: count + 1 }, (_, i) => min + step * i)
}

export function LineChart({ series, data, formatValue, height = 220, referenceLines = [], maxXTicks = 8 }: LineChartProps) {
  const id = useId()
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const width = Math.max(360, data.length * 6 + MARGIN.left + MARGIN.right)
  const innerHeight = height - MARGIN.top - MARGIN.bottom
  const innerWidth = width - MARGIN.left - MARGIN.right

  const seriesValues = data.flatMap((d) => series.map((s) => d.values[s.key])).filter((v): v is number => v !== null)
  const refValues = referenceLines.map((r) => r.value)
  const allValues = [...seriesValues, ...refValues]
  const rawMax = allValues.length ? Math.max(...allValues) : 1
  const rawMin = allValues.length ? Math.min(...allValues, 0) : 0
  const max = rawMax === rawMin ? rawMax + 1 : rawMax
  const min = rawMin
  const yScale = (v: number) => innerHeight - ((v - min) / (max - min)) * innerHeight
  const xStep = data.length > 1 ? innerWidth / (data.length - 1) : 0
  const xScale = (i: number) => i * xStep

  const ticks = niceTicks(min, max, 4)
  const xTickEvery = Math.max(1, Math.ceil(data.length / maxXTicks))

  const linePaths = series.map((s) => {
    const points = data
      .map((d, i) => {
        const v = d.values[s.key]
        return v === null || v === undefined ? null : `${xScale(i)},${yScale(v)}`
      })
      .filter((p): p is string => p !== null)
    return { s, path: points.join(' ') }
  })

  const hoverDatum = hoverIndex !== null ? data[hoverIndex] : null

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label="선그래프"
        className="min-w-[320px]"
      >
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {ticks.map((t) => (
            <line key={t} x1={0} x2={innerWidth} y1={yScale(t)} y2={yScale(t)} stroke="var(--gridline)" strokeWidth={1} />
          ))}

          {referenceLines.map((r) => (
            <g key={r.label}>
              <line
                x1={0}
                x2={innerWidth}
                y1={yScale(r.value)}
                y2={yScale(r.value)}
                stroke={r.color ?? 'var(--text-muted)'}
                strokeWidth={1}
                strokeDasharray="3,3"
              />
              <text x={innerWidth + 4} y={yScale(r.value) + 3} fontSize={9} fill="var(--text-muted)">
                {r.label}
              </text>
            </g>
          ))}

          {linePaths.map(({ s, path }) => (
            <polyline
              key={s.key}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dashed ? '5,3' : undefined}
              points={path}
            />
          ))}

          {hoverIndex !== null && <line x1={xScale(hoverIndex)} x2={xScale(hoverIndex)} y1={0} y2={innerHeight} stroke="var(--border)" strokeWidth={1} />}

          {data.map((_d, i) => {
            if (i % Math.max(1, Math.round(data.length / 60)) !== 0 && i !== data.length - 1) {
              // sparse hit targets so we're not creating hundreds of overlapping rects
              return null
            }
            const bandWidth = Math.max(2, xStep * Math.round(data.length / 60 || 1))
            return (
              <rect
                key={`${id}-hit-${i}`}
                x={xScale(i) - bandWidth / 2}
                y={0}
                width={bandWidth}
                height={innerHeight}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
              />
            )
          })}

          {data.map((d, i) =>
            i % xTickEvery === 0 || i === data.length - 1 ? (
              <text key={d.label} x={xScale(i)} y={innerHeight + 16} textAnchor="middle" fontSize={9} fill="var(--text-muted)">
                {d.label}
              </text>
            ) : null,
          )}
        </g>
      </svg>

      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      {hoverDatum && (
        <div className="mt-1 inline-flex flex-wrap gap-x-3 gap-y-0.5 rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1 text-xs text-[var(--text-primary)] shadow-sm">
          <span className="text-[var(--text-muted)]">{hoverDatum.label}</span>
          {series.map((s) => {
            const v = hoverDatum.values[s.key]
            return v === null || v === undefined ? null : (
              <span key={s.key}>
                {s.label} {formatValue(v)}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
