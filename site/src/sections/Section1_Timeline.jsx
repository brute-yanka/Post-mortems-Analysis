import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { scaleTime, scaleSqrt, extent, max, timeYear, timeFormat } from 'd3'
import IncidentModal from '../components/IncidentModal.jsx'
import './Section1_Timeline.css'

const PROVIDERS = ['AWS', 'Google', 'Azure']
const PROVIDER_COLOR = {
  AWS:    'var(--aws)',
  Google: 'var(--google)',
  Azure:  'var(--azure)',
}

const WIDTH = 1000
const HEIGHT = 360
const MARGIN = { top: 80, right: 28, bottom: 36, left: 84 }
const INNER_W = WIDTH - MARGIN.left - MARGIN.right
const INNER_H = HEIGHT - MARGIN.top - MARGIN.bottom

const fmtYear = timeFormat('%Y')
const fmtDate = timeFormat('%b %-d, %Y')

function formatDuration(m) {
  if (m == null) return '-'
  if (m < 60) return `${Math.round(m)} min`
  if (m < 60 * 24) return `${(m / 60).toFixed(1)} hrs`
  return `${(m / (60 * 24)).toFixed(1)} days`
}

function laneY(provider) {
  const idx = PROVIDERS.indexOf(provider)
  const laneH = INNER_H / PROVIDERS.length
  return idx * laneH + laneH / 2
}

export default function Section1_Timeline({ incidents }) {
  const [filter, setFilter] = useState('All')
  const [hovered, setHovered] = useState(null)
  const [selected, setSelected] = useState(null)

  const dated = useMemo(
    () => incidents.filter(d => d.date && d.durationMinutes != null),
    [incidents],
  )

  const xScale = useMemo(() => {
    const [lo, hi] = extent(dated, d => d.date)
    if (!lo) return null
    return scaleTime().domain([lo, hi]).range([0, INNER_W]).nice()
  }, [dated])

  const rScale = useMemo(() => {
    const hi = max(dated, d => d.durationMinutes) || 1
    return scaleSqrt().domain([1, hi]).range([2.5, 13])
  }, [dated])

  // Top 2 by duration per provider - the editor's "look here" markers.
  const milestones = useMemo(() => {
    const picks = []
    for (const p of PROVIDERS) {
      const top = dated
        .filter(d => d.provider === p)
        .sort((a, b) => b.durationMinutes - a.durationMinutes)
        .slice(0, 2)
      picks.push(...top)
    }
    return picks.sort((a, b) => a.date - b.date)
  }, [dated])

  if (!xScale) {
    return (
      <section className="story-section">
        <div className="status">No dated incidents to plot.</div>
      </section>
    )
  }

  const yearTicks = xScale.ticks(timeYear.every(1))
  const isActive = (provider) => filter === 'All' || filter === provider

  return (
    <section className="story-section tl-section">
      <header className="section-header">
        <p className="kicker">§ 02 · The timeline</p>
        <h2>Ten years, one dot per outage</h2>
        <p className="lede">
          Every published incident, plotted by date. Larger dots are longer
          outages. Hover for a quick summary, click for the full post-mortem.
        </p>
      </header>

      <div className="tl-toolbar" role="tablist" aria-label="Filter by provider">
        {['All', ...PROVIDERS].map(opt => (
          <button
            key={opt}
            role="tab"
            aria-selected={filter === opt}
            className={`tl-chip ${filter === opt ? 'is-on' : ''}`}
            style={opt !== 'All'
              ? { '--chip-color': PROVIDER_COLOR[opt] }
              : { '--chip-color': 'var(--fg)' }}
            onClick={() => setFilter(opt)}
          >
            {opt}
          </button>
        ))}
      </div>

      <div className="tl-chart-wrap" onMouseLeave={() => setHovered(null)}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="tl-chart" role="img"
             aria-label="Timeline of cloud incidents per provider">
          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>

            {/* Lane lines and provider labels */}
            {PROVIDERS.map(p => (
              <g key={p} className={`tl-lane ${isActive(p) ? 'is-active' : 'is-dim'}`}>
                <line x1={0} x2={INNER_W} y1={laneY(p)} y2={laneY(p)} className="tl-laneLine" />
                <text x={-14} y={laneY(p)} dy="0.32em" textAnchor="end"
                      className="tl-laneLabel" style={{ fill: PROVIDER_COLOR[p] }}>
                  {p}
                </text>
              </g>
            ))}

            {/* Year ticks */}
            {yearTicks.map(d => (
              <g key={+d} transform={`translate(${xScale(d)},${INNER_H})`}>
                <line y2={6} className="tl-tickMark" />
                <text y={20} textAnchor="middle" className="tl-tickLabel">{fmtYear(d)}</text>
              </g>
            ))}

            {/* Annotation layer: milestones */}
            {milestones.map((m, i) => {
              const x = xScale(m.date)
              const dotY = laneY(m.provider)
              const r = rScale(m.durationMinutes)
              const labelY = -24 - (i % 2) * 22
              const active = isActive(m.provider)
              return (
                <g
                  key={m.id}
                  className={`tl-annotation ${active ? 'is-active' : 'is-dim'}`}
                  onClick={() => setSelected(m)}
                  style={{ '--anno-color': PROVIDER_COLOR[m.provider] }}
                >
                  <line x1={x} x2={x} y1={dotY - r - 2} y2={labelY + 6} />
                  <circle cx={x} cy={dotY} r={r + 4} className="tl-annoHalo"
                          style={{ stroke: PROVIDER_COLOR[m.provider] }} />
                  <text x={x} y={labelY} textAnchor="middle" className="tl-annoText"
                        style={{ fill: PROVIDER_COLOR[m.provider] }}>
                    {fmtDate(m.date)} · {formatDuration(m.durationMinutes)}
                  </text>
                </g>
              )
            })}

            {/* Dots */}
            {dated.map(d => {
              const active = isActive(d.provider)
              return (
                <circle
                  key={d.id}
                  cx={xScale(d.date)}
                  cy={laneY(d.provider)}
                  r={rScale(d.durationMinutes)}
                  className={`tl-dot ${active ? 'is-active' : 'is-dim'}`}
                  style={{ fill: PROVIDER_COLOR[d.provider] }}
                  onMouseEnter={e => setHovered({ d, x: e.clientX, y: e.clientY })}
                  onMouseMove={e => setHovered({ d, x: e.clientX, y: e.clientY })}
                  onClick={() => setSelected(d)}
                />
              )
            })}
          </g>
        </svg>

        {hovered && createPortal(
          <div className="tl-tooltip"
               style={{ left: hovered.x + 14, top: hovered.y + 14 }}>
            <strong>{fmtDate(hovered.d.date)}</strong>
            <span className="tl-tooltipTitle">{hovered.d.title}</span>
            <span className="tl-tooltipMeta">
              {hovered.d.provider} · {formatDuration(hovered.d.durationMinutes)}
            </span>
          </div>,
          document.body,
        )}
      </div>

      <p className="tl-caption">
        Dashed rings mark the two longest outages on record for each provider.
        Click any dot for the published post-mortem.
      </p>

      {selected && <IncidentModal incident={selected} onClose={() => setSelected(null)} />}
    </section>
  )
}
