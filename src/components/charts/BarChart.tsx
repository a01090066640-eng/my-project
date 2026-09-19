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

export function BarChart({ series, data, formatValue, height = 200 }: BarChartProps) {
  const gradientId = useId()
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null)

  const width = Math.max(320, data.length * (series.length * 20 + GROUP_GAP) + 40)
  const innerHeight = height - MARGIN.top - MARGIN.bottom
  const innerWidth = width - MARGIN.left - MARGIN.right

  const allValues = data.flatMap((d) => series.map((s) => d.values[s.key])).filter((v): v is number => v !== null)
  const rawMax = allValues.length ? Math.max(...allValues, 0) : 1
  const rawMin = allValues.length ? Math.min(...allValues, 0) : 0
  const max = rawMax === rawMin ? rawMax + 1 : rawMax
  const min = rawMin
  const yScale = (v: number) => innerHeight - ((v - min) / (max - min)) * innerHeight
  const zeroY = yScale(0)

  const groupWidth = innerWidth / data.length
  const barWidth = Math.max(4, (groupWidth - GROUP_GAP) / series.length - BAR_GAP)

  const ticks = niceTicks(min, max, 4)

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
            return (
              <g key={d.label}>
                {series.map((s, si) => {
                  const value = d.values[s.key]
                  if (value === null || value === undefined) return null
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
        </g>
      </svg>

      {series.length > 1 && (
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          {series.map((s) => (
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
