import { useMemo, useRef, useState } from 'react'
import { sum, median, format } from 'd3'
import Tooltip from '../components/Tooltip.jsx'
import IncidentModal from '../components/IncidentModal.jsx'
import TriArrow from '../components/TriArrow.jsx'
import './Section0_Overview.css'

const PROVIDER_META = {
  AWS:    { color: 'var(--aws)',    label: 'Amazon Web Services' },
  Google: { color: 'var(--google)', label: 'Google Cloud' },
  Azure:  { color: 'var(--azure)',  label: 'Microsoft Azure' },
}

const fmtInt = format(',')
const fmtPct = format('.0%')

function formatDuration(minutes) {
  if (minutes == null) return '-'
  if (minutes < 60) return `${Math.round(minutes)} min`
  if (minutes < 60 * 24) return `${(minutes / 60).toFixed(1)} hrs`
  return `${(minutes / (60 * 24)).toFixed(1)} days`
}

function aggregate(incidents) {
  const withDuration = incidents.filter(d => d.durationMinutes != null)
  const longestIncident = withDuration.reduce(
    (best, d) => (best == null || d.durationMinutes > best.durationMinutes ? d : best),
    null,
  )
  return {
    count: incidents.length,
    totalMinutes: sum(withDuration, d => d.durationMinutes),
    medianMinutes: median(withDuration, d => d.durationMinutes),
    longestIncident,
    humanErrorShare: incidents.length
      ? incidents.filter(d => d.humanError).length / incidents.length
      : 0,
  }
}

const ICONS = {
  count: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h10"/>
    </svg>
  ),
  total: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v5l3 2"/>
    </svg>
  ),
  median: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h5M15 12h5M12 4v16"/>
    </svg>
  ),
  longest: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18l6-6 4 4 8-8"/>
      <path d="M14 8h7v7"/>
    </svg>
  ),
  human: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4"/>
      <path d="M4 21v-1a8 8 0 0 1 16 0v1"/>
    </svg>
  ),
}

function ProviderCard({ provider, incidents, onSelectIncident }) {
  const cardRef = useRef(null)
  const stats = useMemo(() => aggregate(incidents), [incidents])
  const meta = PROVIDER_META[provider]

  const handleMove = (e) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cx = rect.width / 2
    const cy = rect.height / 2
    const dx = (x - cx) / cx
    const dy = (y - cy) / cy
    const tilt = 2.5
    card.style.setProperty('--mx', `${x}px`)
    card.style.setProperty('--my', `${y}px`)
    card.style.setProperty('--rx', `${(-dy * tilt).toFixed(2)}deg`)
    card.style.setProperty('--ry', `${(dx * tilt).toFixed(2)}deg`)
  }
  const handleLeave = () => {
    const card = cardRef.current
    if (!card) return
    card.style.setProperty('--rx', '0deg')
    card.style.setProperty('--ry', '0deg')
  }

  const longest = stats.longestIncident
  const items = [
    {
      key: 'count', icon: ICONS.count,
      value: fmtInt(stats.count), label: 'incidents',
      tip: 'Number of published post-mortems from this provider in our dataset.',
    },
    {
      key: 'total', icon: ICONS.total,
      value: formatDuration(stats.totalMinutes), label: 'total downtime',
      tip: 'Sum of all reported incident durations. Reporting duration, not customer-minutes.',
    },
    {
      key: 'median', icon: ICONS.median,
      value: formatDuration(stats.medianMinutes), label: 'median outage',
      tip: 'Half of incidents are shorter, half longer - a robust pulse on a typical outage.',
    },
    {
      key: 'longest', icon: ICONS.longest,
      value: formatDuration(longest?.durationMinutes),
      label: 'longest single outage',
      tip: 'Click to read the post-mortem for this specific incident.',
      onClick: longest ? () => onSelectIncident(longest) : null,
    },
    {
      key: 'human', icon: ICONS.human,
      value: fmtPct(stats.humanErrorShare), label: 'flagged as human error',
      tip: 'Share of post-mortems where analysts marked human action as a contributing cause.',
    },
  ]

  return (
    <article
      ref={cardRef}
      className="ov-card"
      style={{ '--card-accent': meta.color }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <header className="ov-card__head">
        <h3>{provider}</h3>
        <p className="ov-card__sub">{meta.label}</p>
      </header>
      <ul className="ov-card__stats">
        {items.map(item => {
          const clickable = !!item.onClick
          return (
            <li
              key={item.key}
              className={clickable ? 'ov-stat ov-stat--click' : 'ov-stat'}
              onClick={clickable ? item.onClick : undefined}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={clickable ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  item.onClick()
                }
              } : undefined}
            >
              <Tooltip label={item.tip}>
                <span className="ov-stat__icon" aria-label={item.label}>{item.icon}</span>
              </Tooltip>
              <div className="ov-stat__body">
                <span className="ov-stat__value">
                  {item.value}
                  {clickable && <TriArrow dir="right" size={15} className="ov-stat__arrow" />}
                </span>
                <span className="ov-stat__label">{item.label}</span>
              </div>
            </li>
          )
        })}
      </ul>
    </article>
  )
}

export default function Section0_Overview({ incidents }) {
  const [selected, setSelected] = useState(null)

  const byProvider = useMemo(() => {
    const groups = { AWS: [], Google: [], Azure: [] }
    for (const inc of incidents) {
      if (groups[inc.provider]) groups[inc.provider].push(inc)
    }
    return groups
  }, [incidents])

  return (
    <section className="story-section ov-section">
      <header className="section-header">
        <p className="kicker">§ 01 · Overview</p>
        <h2>Three providers, a decade of disclosures</h2>
        <p className="lede">
          Before any comparison, the basics. Hover an icon for what each number really tells us - and click "longest single outage" to jump straight to that incident's post-mortem.
        </p>
      </header>
      <div className="ov-grid">
        {['AWS', 'Google', 'Azure'].map(p => (
          <ProviderCard
            key={p}
            provider={p}
            incidents={byProvider[p]}
            onSelectIncident={setSelected}
          />
        ))}
      </div>
      {selected && <IncidentModal incident={selected} onClose={() => setSelected(null)} />}
    </section>
  )
}
