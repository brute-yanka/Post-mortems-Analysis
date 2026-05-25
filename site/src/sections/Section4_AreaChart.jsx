import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { scaleLinear, scaleTime, timeFormat, timeMonth, timeYear, max, extent } from 'd3'
import IncidentModal from '../components/IncidentModal.jsx'
import './Section4_AreaChart.css'

const PROVIDERS = ['Azure', 'AWS', 'Google']
const PROVIDER_META = {
  AWS: { color: 'var(--aws)', label: 'Amazon Web Services' },
  Google: { color: 'var(--google)', label: 'Google Cloud' },
  Azure: { color: 'var(--azure)', label: 'Microsoft Azure' },
}
const PROVIDER_Y_TICKS = {
  AWS: [0, 24 * 60, 2 * 24 * 60, 3 * 24 * 60, 4 * 24 * 60],
  Google: [0, 5 * 24 * 60, 10 * 24 * 60, 15 * 24 * 60, 20 * 24 * 60, 25 * 24 * 60],
  Azure: [0, 4 * 24 * 60, 8 * 24 * 60, 12 * 24 * 60, 16 * 24 * 60, 20 * 24 * 60],
}

const START = new Date(2011, 0, 1)
const END_EX = new Date(2022, 0, 1)

const WIDTH = 1040
const HEIGHT = 320
const MARGIN = { top: 40, right: 32, bottom: 44, left: 70 }
const INNER_W = WIDTH - MARGIN.left - MARGIN.right
const INNER_H = HEIGHT - MARGIN.top - MARGIN.bottom

const fmtMonth = timeFormat('%b %Y')
const fmtYear = timeFormat('%Y')

function monthKey(date) {
  return date.getFullYear() * 12 + date.getMonth()
}

function midMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 15)
}

function formatDuration(minutes) {
  if (minutes == null) return '-'
  if (minutes < 60) return `${Math.round(minutes)} min`
  if (minutes < 60 * 24) return `${(minutes / 60).toFixed(1)} hrs`
  return `${(minutes / (60 * 24)).toFixed(1)} days`
}

export default function Section4_AreaChart({ incidents }) {
  const [provider, setProvider] = useState('AWS')
  const [hovered, setHovered] = useState(null)
  const [modalIncident, setModalIncident] = useState(null)

  const providerIncidents = useMemo(
    () => incidents.filter(d => d.provider === provider && d.date),
    [incidents, provider],
  )

  const [rangeStart, rangeEndEx] = useMemo(() => {
    const [lo, hi] = extent(providerIncidents, d => d.date)
    if (!lo || !hi) return [START, END_EX]
    const start = new Date(lo.getFullYear(), lo.getMonth(), 1)
    const end = timeMonth.offset(new Date(hi.getFullYear(), hi.getMonth(), 1), 1)
    const clampStart = start < START ? START : start
    const clampEnd = end > END_EX ? END_EX : end
    if (clampEnd <= clampStart) return [START, END_EX]
    return [clampStart, clampEnd]
  }, [providerIncidents])

  const [displayStart, displayEndEx] = useMemo(() => {
    const padStart = timeMonth.offset(rangeStart, -1)
    const start = padStart < START ? START : padStart
    return [start, rangeEndEx]
  }, [rangeStart, rangeEndEx])

  const monthly = useMemo(() => {
    const months = timeMonth.range(rangeStart, rangeEndEx)
    const buckets = new Map()
    for (const m of months) {
      buckets.set(monthKey(m), { date: m, totalMinutes: 0, incidents: [] })
    }

    for (const inc of providerIncidents) {
      if (inc.date < rangeStart || inc.date >= rangeEndEx) continue
      const bucket = buckets.get(monthKey(inc.date))
      if (!bucket) continue
      bucket.incidents.push(inc)
      if (inc.durationMinutes != null) {
        bucket.totalMinutes += inc.durationMinutes
      }
    }

    return months.map(m => buckets.get(monthKey(m)))
  }, [providerIncidents, rangeStart, rangeEndEx])

  const monthIndex = useMemo(() => {
    const map = new Map()
    for (const m of monthly) map.set(monthKey(m.date), m)
    return map
  }, [monthly])

  const majorIssues = useMemo(() => {
    const byMonth = new Map()
    for (const inc of providerIncidents) {
      if (inc.durationMinutes == null) continue
      const key = monthKey(inc.date)
      const existing = byMonth.get(key)
      if (!existing || inc.durationMinutes > existing.durationMinutes) {
        byMonth.set(key, inc)
      }
    }
    return Array.from(byMonth.values())
      .sort((a, b) => b.durationMinutes - a.durationMinutes)
      .slice(0, 6)
  }, [providerIncidents])

  const yMax = useMemo(
    () => PROVIDER_Y_TICKS[provider][PROVIDER_Y_TICKS[provider].length - 1],
    [provider],
  )

  const xScale = useMemo(
    () => scaleTime().domain([displayStart, displayEndEx]).range([0, INNER_W]),
    [displayStart, displayEndEx],
  )

  const yScale = useMemo(
    () => scaleLinear().domain([0, yMax || 1]).range([INNER_H, 0]),
    [yMax],
  )

  const points = useMemo(
    () => monthly.map(m => ({
      month: m,
      x: xScale(midMonth(m.date)),
      y: yScale(m.totalMinutes),
    })),
    [monthly, xScale, yScale],
  )

  const areaPath = useMemo(() => {
    if (points.length === 0) return ''
    let d = `M ${points[0].x} ${INNER_H}`
    for (const p of points) d += ` L ${p.x} ${p.y}`
    d += ` L ${points[points.length - 1].x} ${INNER_H} Z`
    return d
  }, [points])

  const linePath = useMemo(() => {
    if (points.length === 0) return ''
    let d = `M ${points[0].x} ${points[0].y}`
    for (const p of points) d += ` L ${p.x} ${p.y}`
    return d
  }, [points])

  const yearTicks = useMemo(
    () => xScale.ticks(timeYear.every(1)),
    [xScale],
  )

  const yTicks = useMemo(
    () => PROVIDER_Y_TICKS[provider],
    [provider],
  )

  const totals = useMemo(() => {
    const totalMinutes = monthly.reduce((sum, m) => sum + m.totalMinutes, 0)
    const monthsWithData = monthly.filter(m => m.totalMinutes > 0).length
    return {
      totalMinutes,
      monthsWithData,
      maxMonth: yMax,
    }
  }, [monthly, yMax])

  const majorMarkers = useMemo(() => {
    return majorIssues.map((inc, index) => {
      const bucket = monthIndex.get(monthKey(inc.date))
      const x = bucket ? xScale(midMonth(bucket.date)) : 0
      const y = bucket ? yScale(bucket.totalMinutes) : INNER_H
      return { incident: inc, bucket, x, y, index }
    })
  }, [majorIssues, monthIndex, xScale, yScale])

  const handleHover = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const scaleX = WIDTH / rect.width
    const svgX = (event.clientX - rect.left) * scaleX
    const chartX = svgX - MARGIN.left
    if (chartX < 0 || chartX > INNER_W) {
      setHovered(null)
      return
    }
    const date = xScale.invert(chartX)
    const bucket = monthIndex.get(monthKey(date))
    if (!bucket) {
      setHovered(null)
      return
    }
    setHovered({ month: bucket, x: event.clientX, y: event.clientY })
  }

  useEffect(() => {
    setHovered(null)
    setModalIncident(null)
  }, [provider])

  return (
    <section className="story-section ac-section">
      <header className="section-header">
        <p className="kicker">§ 04 · A decade of downtime</p>
        <h2>How one provider's outage minutes shifted</h2>
        <p className="lede">
          Total reported downtime per month, annotated with the biggest incidents.
          Click a dot to read the full post-mortem. Remember: this is the story
          of <em>what was published</em>, not a full picture of reliability.
        </p>
      </header>

      <div className="ac-toolbar" role="tablist" aria-label="Select a provider">
        <div className="ac-chips">
          {PROVIDERS.map(opt => (
            <button
              key={opt}
              role="tab"
              aria-selected={provider === opt}
              className={`ac-chip ${provider === opt ? 'is-on' : ''}`}
              style={{ '--chip-color': PROVIDER_META[opt].color }}
              onClick={() => setProvider(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
        <div className="ac-stats">
          <div className="ac-stat">
            <span className="ac-statLabel">Total downtime</span>
            <span className="ac-statValue">{formatDuration(totals.totalMinutes)}</span>
          </div>
          <div className="ac-stat">
            <span className="ac-statLabel">Max month</span>
            <span className="ac-statValue">{formatDuration(totals.maxMonth)}</span>
          </div>
          <div className="ac-stat">
            <span className="ac-statLabel">Active months</span>
            <span className="ac-statValue">{totals.monthsWithData}</span>
          </div>
        </div>
      </div>

      <div className="ac-chartWrap" key={provider}>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="ac-chart"
          role="img"
          aria-label={`Monthly downtime totals for ${PROVIDER_META[provider].label}`}
          onMouseMove={handleHover}
          onMouseLeave={() => setHovered(null)}
        >
          <defs>
            <linearGradient id={`ac-gradient-${provider}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={PROVIDER_META[provider].color} stopOpacity="0.55" />
              <stop offset="80%" stopColor={PROVIDER_META[provider].color} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
            {yTicks.map(tick => (
              <g key={tick} className="ac-gridRow" transform={`translate(0,${yScale(tick)})`}>
                <line x2={INNER_W} className="ac-gridLine" />
                <text x={-12} dy="0.32em" textAnchor="end" className="ac-gridLabel">
                  {formatDuration(tick)}
                </text>
              </g>
            ))}

            {yearTicks.map(d => (
              <g key={+d} transform={`translate(${xScale(d)},${INNER_H})`}>
                <line y2={7} className="ac-yearTick" />
                <text y={24} textAnchor="middle" className="ac-yearLabel">
                  {fmtYear(d)}
                </text>
              </g>
            ))}

            <path
              d={areaPath}
              className="ac-area"
              style={{ fill: `url(#ac-gradient-${provider})` }}
            />
            <path
              d={linePath}
              className="ac-line"
              style={{ stroke: PROVIDER_META[provider].color }}
            />

            <rect
              x={0}
              y={0}
              width={INNER_W}
              height={INNER_H}
              className="ac-hoverBand"
            />

            {majorMarkers.map(marker => {
              const labelY = Math.max(16, marker.y - 28 - (marker.index % 3) * 16)
              return (
                <g
                  key={`${provider}-${marker.incident.id}`}
                  className="ac-marker"
                  style={{ '--marker-color': PROVIDER_META[provider].color }}
                  onClick={() => setModalIncident(marker.incident)}
                >
                  <line x1={marker.x} x2={marker.x} y1={marker.y} y2={labelY + 6} />
                  <circle cx={marker.x} cy={marker.y} r={4.2} className="ac-markerDot" />
                  <text x={marker.x} y={labelY} textAnchor="middle" className="ac-markerLabel">
                    {fmtMonth(marker.incident.date)}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>

        {max(monthly, d => d.totalMinutes) === 0 && (
          <div className="ac-empty">
            No durations reported for this provider between 2011 and 2021.
          </div>
        )}

        {hovered && createPortal(
          <div className="ac-tooltip" style={{ left: hovered.x + 14, top: hovered.y + 14 }}>
            <strong>{fmtMonth(hovered.month.date)}</strong>
            <span className="ac-tooltipValue">
              {formatDuration(hovered.month.totalMinutes)} downtime
            </span>
            <span className="ac-tooltipMeta">
              {hovered.month.incidents.length} incidents reported
            </span>
          </div>,
          document.body,
        )}
      </div>

      {modalIncident && (
        <IncidentModal incident={modalIncident} onClose={() => setModalIncident(null)} />
      )}
    </section>
  )
}
