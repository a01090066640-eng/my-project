import { useId, useState } from 'react'

export interface BarSeries {
  key: string
  label: string
  /** CSS color value, e.g. 'var(--series-1)' */
  color: string
}

export interface BarChartDatum {
  label: string
  values: Record<string, number | null>
}

interface BarChartProps {
  series: BarSeries[]
  data: BarChartDatum[]
  formatValue: (value: number) => string
  height?: number
  /** Stack bar series instead of grouping them side by side (positive values only). */
  stacked?: boolean
  /** Extra series drawn as lines on the same axis as the bars — keep units identical, never a second scale. */
  lines?: BarSeries[]
}

const MARGIN = { top: 8, right: 8, bottom: 24, left: 8 }
const BAR_GAP = 4
const GROUP_GAP = 16

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min]
  const span = max - min
  const step = span / count
  const ticks: number[] = []
  for (let i = 0; i <= count; i++) ticks.push(min + step * i)
  return ticks
}

export function BarChart({ series, data, formatValue, height = 200, stacked = false, lines = [] }: BarChartProps) {
  const gradientId = useId()
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null)

  const width = Math.max(320, data.length * (series.length * 20 + GROUP_GAP) + 40)
  const innerHeight = height - MARGIN.top - MARGIN.bottom
  const innerWidth = width - MARGIN.left - MARGIN.right

  const barValues = data.flatMap((d) => series.map((s) => d.values[s.key])).filter((v): v is number => v !== null)
  const lineValues = data.flatMap((d) => lines.map((s) => d.values[s.key])).filter((v): v is number => v !== null)
  const stackTotals = stacked
    ? data.map((d) => series.reduce((sum, s) => sum + (d.values[s.key] ?? 0), 0))
    : []
  const allValues = [...barValues, ...lineValues, ...stackTotals]
  const rawMax = allValues.length ? Math.max(...allValues, 0) : 1
  const rawMin = allValues.length ? Math.min(...allValues, 0) : 0
  const max = rawMax === rawMin ? rawMax + 1 : rawMax
  const min = rawMin
  const yScale = (v: number) => innerHeight - ((v - min) / (max - min)) * innerHeight
  const zeroY = yScale(0)

  const groupWidth = innerWidth / data.length
  const barCountPerGroup = stacked ? 1 : series.length
  const barWidth = Math.max(4, (groupWidth - GROUP_GAP) / barCountPerGroup - BAR_GAP)

  const ticks = niceTicks(min, max, 4)

  const linePoints = lines.map((lineSeries) => {
    const points = data
      .map((d, i) => {
        const value = d.values[lineSeries.key]
        if (value === null || value === undefined) return null
        const x = i * groupWidth + groupWidth / 2
        return { x, y: yScale(value), value, label: d.label }
      })
      .filter((p): p is { x: number; y: number; value: number; label: string } => p !== null)
    return { series: lineSeries, points }
  })

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label="막대그래프"
        className="min-w-[320px]"
      >
        <defs>
          <clipPath id={`${gradientId}-clip`}>
            <rect x={0} y={0} width={innerWidth} height={innerHeight} />
          </clipPath>
        </defs>
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {ticks.map((t) => (
            <line
              key={t}
              x1={0}
              x2={innerWidth}
              y1={yScale(t)}
              y2={yScale(t)}
              stroke="var(--gridline)"
              strokeWidth={1}
            />
          ))}
          <line x1={0} x2={innerWidth} y1={zeroY} y2={zeroY} stroke="var(--baseline, var(--gridline))" strokeWidth={1} />

          {data.map((d, i) => {
            const groupX = i * groupWidth + GROUP_GAP / 2
            let stackY = zeroY
            return (
              <g key={d.label}>
                {series.map((s, si) => {
                  const value = d.values[s.key]
                  if (value === null || value === undefined) return null
                  if (stacked) {
                    const barHeight = Math.max(0, (yScale(0) - yScale(value)))
                    const y = stackY - barHeight
                    stackY = y
                    return (
                      <rect
                        key={s.key}
                        x={groupX}
                        y={y}
                        width={barWidth}
                        height={Math.max(1, barHeight)}
                        rx={2}
                        fill={s.color}
                        onMouseEnter={() =>
                          setHover({ x: groupX + barWidth / 2, y, text: `${d.label} · ${s.label}: ${formatValue(value)}` })
                        }
                        onMouseLeave={() => setHover(null)}
                      >
                        <title>{`${d.label} · ${s.label}: ${formatValue(value)}`}</title>
                      </rect>
                    )
                  }
                  const barX = groupX + si * (barWidth + BAR_GAP)
                  const y = Math.min(yScale(value), zeroY)
                  const barHeight = Math.max(1, Math.abs(yScale(value) - zeroY))
                  return (
                    <rect
                      key={s.key}
                      x={barX}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx={2}
                      fill={s.color}
                      onMouseEnter={() =>
                        setHover({
                          x: barX + barWidth / 2,
                          y,
                          text: `${d.label} · ${s.label}: ${formatValue(value)}`,
                        })
                      }
                      onMouseLeave={() => setHover(null)}
                    >
                      <title>{`${d.label} · ${s.label}: ${formatValue(value)}`}</title>
                    </rect>
                  )
                })}
                <text
                  x={groupX + (groupWidth - GROUP_GAP) / 2}
                  y={innerHeight + 16}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--text-muted)"
                >
                  {d.label}
                </text>
              </g>
            )
          })}

          {linePoints.map(({ series: lineSeries, points }) => (
            <g key={lineSeries.key}>
              <polyline
                fill="none"
                stroke={lineSeries.color}
                strokeWidth={2}
                points={points.map((p) => `${p.x},${p.y}`).join(' ')}
              />
              {points.map((p) => (
                <circle
                  key={p.x}
                  cx={p.x}
                  cy={p.y}
                  r={3}
                  fill={lineSeries.color}
                  onMouseEnter={() =>
                    setHover({ x: p.x, y: p.y, text: `${p.label} · ${lineSeries.label}: ${formatValue(p.value)}` })
                  }
                  onMouseLeave={() => setHover(null)}
                >
                  <title>{`${p.label} · ${lineSeries.label}: ${formatValue(p.value)}`}</title>
                </circle>
              ))}
            </g>
          ))}
        </g>
      </svg>

      {(series.length > 1 || lines.length > 0) && (
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          {[...series, ...lines].map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ background: s.color }}
              />
              {s.label}
            </span>
          ))}
        </div>
      )}

      {hover && (
        <div className="pointer-events-none mt-1 inline-block rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1 text-xs text-[var(--text-primary)] shadow-sm">
          {hover.text}
        </div>
      )}
    </div>
  )
}
