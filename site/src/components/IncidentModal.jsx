import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { timeFormat } from 'd3'
import './IncidentModal.css'

const PROVIDER_COLOR = {
  AWS:    'var(--aws)',
  Google: 'var(--google)',
  Azure:  'var(--azure)',
}

const fmtDate = timeFormat('%B %-d, %Y')

function formatDuration(m) {
  if (m == null) return '-'
  if (m < 60) return `${Math.round(m)} min`
  if (m < 60 * 24) return `${(m / 60).toFixed(1)} hrs`
  return `${(m / (60 * 24)).toFixed(1)} days`
}

export default function IncidentModal({ incident, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return createPortal(
    <div className="im-backdrop" onClick={onClose}>
      <div className="im-card" onClick={(e) => e.stopPropagation()}
           role="dialog" aria-modal="true" aria-labelledby="im-title">
        <button className="im-close" onClick={onClose} aria-label="Close">×</button>

        <div className="im-tag" style={{ background: PROVIDER_COLOR[incident.provider] }}>
          {incident.provider}
        </div>
        <h3 id="im-title" className="im-title">{incident.title}</h3>
        <p className="im-meta">
          <span>{incident.date ? fmtDate(incident.date) : '-'}</span>
          <span className="im-sep">·</span>
          <span>{formatDuration(incident.durationMinutes)}</span>
          {incident.humanError && (
            <>
              <span className="im-sep">·</span>
              <span className="im-badge">flagged human error</span>
            </>
          )}
        </p>

        {incident.servicesAffected.length > 0 && (
          <div className="im-row">
            <div className="im-label">Services affected</div>
            <div className="im-chips">
              {incident.servicesAffected.map((s, i) => (
                <span key={i} className="im-chip">{s}</span>
              ))}
            </div>
          </div>
        )}

        {incident.rootCauseL2.length > 0 && (
          <div className="im-row">
            <div className="im-label">Root cause</div>
            <div className="im-chips">
              {incident.rootCauseL2.map((c, i) => (
                <span key={i} className="im-chip im-chip--cause">{c}</span>
              ))}
            </div>
          </div>
        )}

        {incident.mitigationActions.length > 0 && (
          <div className="im-row">
            <div className="im-label">Mitigation</div>
            <div className="im-chips">
              {incident.mitigationActions.map((m, i) => (
                <span key={i} className="im-chip im-chip--mit">{m}</span>
              ))}
            </div>
          </div>
        )}

        {incident.summary && (
          <div className="im-row">
            <div className="im-label">Summary</div>
            <p className="im-summary">{incident.summary}</p>
          </div>
        )}

        {incident.url && (
          <a href={incident.url} target="_blank" rel="noopener noreferrer" className="im-link">
            Read the full post-mortem ↗
          </a>
        )}
      </div>
    </div>,
    document.body
  )
}
