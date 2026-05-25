import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { timeFormat, format } from 'd3'
import IncidentModal from '../components/IncidentModal.jsx'
import './Section3_HumanError.css'

const COLS = 36

const fmtDate = timeFormat('%b %-d, %Y')
const fmtPct = format('.1%')

function formatDuration(m) {
  if (m == null) return '-'
  if (m < 60) return `${Math.round(m)} min`
  if (m < 60 * 24) return `${(m / 60).toFixed(1)} hrs`
  return `${(m / (60 * 24)).toFixed(1)} days`
}

const UserIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="3.2" />
    <path d="M5 21v-1a7 7 0 0 1 14 0v1" />
  </svg>
)

export default function Section3_HumanError({ incidents }) {
  const [hovered, setHovered] = useState(null)
  const [selected, setSelected] = useState(null)

  const sorted = useMemo(
    () => [...incidents].filter(d => d.date).sort((a, b) => a.date - b.date),
    [incidents],
  )

  const humanCount = sorted.filter(d => d.humanError).length
  const total = sorted.length

  const onCellEnter = (e, inc) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setHovered({ inc, x: rect.left + rect.width / 2, y: rect.top })
  }
  const onCellLeave = () => setHovered(null)

  return (
    <section className="story-section we-section">
      <header className="section-header">
        <p className="kicker">§ 03 · The human factor</p>
        <h2>Only {humanCount} of {total} were "human error"</h2>
        <p className="lede">
          Every square is one published post-mortem, oldest to newest. Squares
          carrying a user icon were flagged as human-triggered — typically a
          misconfiguration, a typo pushed to production, or a manual change
          that took effect immediately and without warning.
        </p>
      </header>

      <div className="we-stats">
        <span><strong>{humanCount}</strong> flagged human error</span>
        <span className="we-stats__sep">·</span>
        <span><strong>{fmtPct(humanCount / total)}</strong> of all incidents</span>
      </div>

      <div className="we-wrap">
        <div className="we-grid" style={{ '--cols': COLS }}>
          {sorted.map((inc, i) => (
            <div
              key={inc.id}
              role="button"
              tabIndex={-1}
              className={`we-cell we-cell--${inc.provider} ${inc.humanError ? 'is-human' : ''}`}
              style={{ animationDelay: `${Math.min(i * 4, 1400)}ms` }}
              onMouseEnter={(e) => onCellEnter(e, inc)}
              onMouseLeave={onCellLeave}
              onClick={() => setSelected(inc)}
              aria-label={`${inc.provider}: ${inc.title}`}
            >
              {inc.humanError && <UserIcon className="we-cellIcon" />}
            </div>
          ))}
        </div>

        <div className="we-legend">
          <span className="we-legendItem">
            <span className="we-legendSwatch we-legendSwatch--AWS" /> AWS
          </span>
          <span className="we-legendItem">
            <span className="we-legendSwatch we-legendSwatch--Google" /> Google
          </span>
          <span className="we-legendItem">
            <span className="we-legendSwatch we-legendSwatch--Azure" /> Azure
          </span>
          <span className="we-legendItem we-legendItem--human">
            <span className="we-legendIconWrap"><UserIcon className="we-legendIcon" /></span>
            Flagged human error
          </span>
        </div>
      </div>

      <p className="we-caption">
        Hover any square for the date and title, click for the full post-mortem.
      </p>

      {hovered && createPortal(
        <div className="we-tooltip" style={{ left: hovered.x, top: hovered.y }}>
          <strong>{fmtDate(hovered.inc.date)}</strong>
          <span className="we-tooltipTitle">{hovered.inc.title}</span>
          <span className="we-tooltipMeta">
            {hovered.inc.provider} · {formatDuration(hovered.inc.durationMinutes)}
            {hovered.inc.humanError && ' · flagged human error'}
          </span>
        </div>,
        document.body,
      )}

      {selected && <IncidentModal incident={selected} onClose={() => setSelected(null)} />}
    </section>
  )
}
