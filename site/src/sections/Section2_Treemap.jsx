import { useState, useMemo } from 'react'
import TriArrow from '../components/TriArrow.jsx'
import './Section2_Treemap.css'

const PROVIDERS = ['AWS', 'Google', 'Azure']
const PROVIDER_COLOR = {
  AWS:    'var(--aws)',
  Google: 'var(--google)',
  Azure:  'var(--azure)',
}

const MAX_BUGS_SHOWN     = 8
const MAX_SOLUTIONS_SHOWN = 8

const BUG_EXPLAIN = {
  'network':           'Routing, connectivity, or bandwidth failure',
  'hardware':          'Physical component failure or degradation',
  'software':          'Code defect or unexpected runtime behavior',
  'configuration':     'Misconfigured service, setting, or policy',
  'deployment':        'Issue introduced during a rollout or update',
  'human action':      'Direct operator or engineer action caused the fault',
  'capacity':          'Resource limits hit — scaling or throttling failure',
  'dependency':        'Third-party or internal service cascaded failure',
  'storage':           'Disk, database, or data-access problem',
  'dns':               'Domain name resolution failure',
  'certificate':       'TLS/SSL certificate expiry or validation error',
  'overload':          'Unexpected traffic spike overwhelmed capacity',
  'memory':            'Memory leak, exhaustion, or allocation error',
  'cpu':               'CPU saturation or compute resource bottleneck',
  'race condition':    'Concurrent operations produced an inconsistent state',
  'unspecified':       'Root cause not documented in the post-mortem',
  'other':             'Cause documented but outside standard categories',
}

const MITIGATION_EXPLAIN = {
  'roll back deployment':            'Revert to a previously stable software version',
  'rollback deployment':             'Revert to a previously stable software version',
  'roll back configuration change':  'Restore settings to last known-good state',
  'revert configuration':            'Restore previous configuration settings',
  'revert the configuration change': 'Restore previous configuration settings',
  'deploy a hotfix':                 'Ship an emergency code patch to production',
  'deploy a platform hotfix':        'Emergency patch applied at the platform layer',
  'apply a hotfix':                  'Ship an emergency code patch to production',
  'deploy new update':               'Release a corrective software update',
  'fix bug':                         'Identify and patch the underlying code defect',
  'update configuration':            'Adjust system settings to correct the fault',
  'change configuration':            'Modify settings to restore correct behavior',
  'add capacity':                    'Provision more resources to meet demand',
  'reduce load':                     'Throttle traffic or shed load to restore stability',
  'recover automatically':           'System self-healed without manual intervention',
  'self heal':                       'Automated recovery restored service',
  'shift traffic':                   'Route requests away from the affected region',
  'add monitoring':                  'Instrument the system to catch this failure sooner',
  'fail over the affected processes': 'Switch to a backup system or region',
  'manual recovery of the system':   'Engineers manually restored affected systems',
}

// Cloud shape path for viewBox "0 0 200 120"
// Stroke-only, text placed at roughly (100, 68) and (100, 87)
const CLOUD_PATH =
  'M28,104 Q10,104 10,86 Q10,68 26,62 Q20,46 36,38 Q44,20 65,24 Q71,12 88,16 Q98,9 112,18 Q124,11 140,24 Q154,17 164,33 Q178,35 180,53 Q188,60 186,76 Q183,93 165,95 Q163,105 147,105 L28,104 Z'

const CloudShape = ({ provider, count }) => (
  <svg className="zm-cloud__svg" viewBox="0 0 200 120" fill="none" aria-hidden="true">
    <path
      d={CLOUD_PATH}
      stroke="currentColor"
      strokeWidth="3"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
    <text
      x="100" y="63"
      textAnchor="middle" dominantBaseline="middle"
      fill="currentColor" fontSize="28" fontWeight="800"
      fontFamily="ui-serif, Georgia, serif"
    >
      {provider}
    </text>
    <text
      x="100" y="86"
      textAnchor="middle" dominantBaseline="middle"
      fill="currentColor" fontSize="13" opacity="0.75"
      letterSpacing="0.06em"
      fontFamily="ui-monospace, 'SF Mono', SFMono-Regular, Consolas, monospace"
    >
      {count} incidents
    </text>
  </svg>
)

const BugIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2l1.88 1.88" />
    <path d="M14.12 3.88L16 2" />
    <path d="M9 7.13a3 3 0 0 1 6 0v1" />
    <rect x="7" y="8" width="10" height="13" rx="5" fill="currentColor" fillOpacity="0.12" />
    <path d="M12 21V10" />
    <path d="M6 13H3" />
    <path d="M21 13h-3" />
    <path d="M6 9 4 6" />
    <path d="M18 9l2-3" />
    <path d="M4 20l3-2" />
    <path d="M20 20l-3-2" />
  </svg>
)

const WrenchIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
)

export default function Section2_Treemap({ incidents }) {
  const [view, setView]         = useState('clouds')
  const [provider, setProvider] = useState(null)
  const [problem, setProblem]   = useState(null)
  const [zoom, setZoom]         = useState(null)

  const byProvider = useMemo(() => {
    const g = { AWS: [], Google: [], Azure: [] }
    for (const inc of incidents) if (g[inc.provider]) g[inc.provider].push(inc)
    return g
  }, [incidents])

  const problems = useMemo(() => {
    if (!provider) return []
    const map = new Map()
    for (const inc of byProvider[provider]) {
      const causes = inc.rootCauseL2.length ? inc.rootCauseL2 : ['unspecified']
      for (const c of causes) {
        if (!map.has(c)) map.set(c, [])
        map.get(c).push(inc)
      }
    }
    return Array.from(map.entries())
      .map(([name, incs]) => ({ name, incidents: incs, count: incs.length }))
      .sort((a, b) => b.count - a.count)
  }, [provider, byProvider])

  const solutions = useMemo(() => {
    if (!problem) return []
    const p = problems.find(x => x.name === problem)
    if (!p) return []
    const map = new Map()
    for (const inc of p.incidents) {
      for (const m of inc.mitigationActions) {
        map.set(m, (map.get(m) || 0) + 1)
      }
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [problem, problems])

  const pickProvider = (p) => {
    if (zoom) return
    setZoom({ kind: 'cloud', target: p })
    setTimeout(() => {
      setProvider(p)
      setView('bugs')
      setZoom(null)
    }, 450)
  }

  const pickProblem = (name) => {
    if (zoom) return
    setZoom({ kind: 'bug', target: name })
    setTimeout(() => {
      setProblem(name)
      setView('wrenches')
      setZoom(null)
    }, 400)
  }

  const resetToClouds = () => { setView('clouds'); setProvider(null); setProblem(null) }
  const backToBugs   = () => { setView('bugs'); setProblem(null) }

  return (
    <section className="story-section cs-section">
      <header className="section-header">
        <p className="kicker">§ 02 · Why things broke</p>
        <h2>Pick a cloud, find the bugs</h2>
        <p className="lede">
          Each provider's published outages have their own bestiary of bugs - and
          their own well-worn wrench for each one. Click a cloud to fly in.
        </p>
      </header>

      {view !== 'clouds' && (
        <nav className="cs-crumbs" aria-label="Breadcrumb">
          <button className="cs-crumb" onClick={resetToClouds}>
            <TriArrow dir="left" size={15} /> Pick another cloud
          </button>
          {view === 'wrenches' && (
            <>
              <span className="cs-crumbSep">/</span>
              <button className="cs-crumb" onClick={backToBugs}>
                All {provider} bugs
              </button>
            </>
          )}
        </nav>
      )}

      {view === 'clouds' && (
        <div className="zm-clouds-wrap" key="clouds">
          <div className="zm-clouds">
            {PROVIDERS.map(p => {
              const zoomingThis  = zoom?.kind === 'cloud' && zoom.target === p
              const fadingOthers = zoom?.kind === 'cloud' && zoom.target !== p
              return (
                <button
                  key={p}
                  className={`zm-cloud zm-cloud--${p}
                              ${zoomingThis ? 'is-zooming' : ''}
                              ${fadingOthers ? 'is-fading' : ''}`}
                  style={{ '--card-accent': PROVIDER_COLOR[p] }}
                  onClick={() => pickProvider(p)}
                  disabled={!!zoom}
                  aria-label={`${p}: ${byProvider[p].length} incidents`}
                >
                  <CloudShape provider={p} count={byProvider[p].length} />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {view === 'bugs' && (() => {
        const shown   = problems.slice(0, MAX_BUGS_SHOWN)
        const hidden  = problems.length - shown.length
        return (
          <div className="zm-panel" key={`bugs-${provider}`} style={{ '--card-accent': PROVIDER_COLOR[provider] }}>
            <h3 className="zm-panel__title">
              Inside {provider}'s cloud · top {shown.length} root causes
            </h3>
            <div className="zm-bug-grid">
              {shown.map((p, i) => {
                const zoomingThis  = zoom?.kind === 'bug' && zoom.target === p.name
                const fadingOthers = zoom?.kind === 'bug' && zoom.target !== p.name
                const explain = BUG_EXPLAIN[p.name.toLowerCase()] ?? ''
                return (
                  <button
                    key={p.name}
                    className={`zm-bugCard
                                ${zoomingThis ? 'is-zooming' : ''}
                                ${fadingOthers ? 'is-fading' : ''}`}
                    style={{ animationDelay: `${i * 28}ms` }}
                    onClick={() => pickProblem(p.name)}
                    disabled={!!zoom}
                  >
                    <BugIcon className="zm-cardIcon" />
                    <div className="zm-cardBody">
                      <span className="zm-cardLabel">{p.name}</span>
                      {explain && <span className="zm-cardExplain">{explain}</span>}
                    </div>
                    <span className="zm-cardCount">×{p.count}</span>
                  </button>
                )
              })}
            </div>
            {hidden > 0 && (
              <p className="zm-moreNote">+ {hidden} less frequent root cause{hidden !== 1 ? 's' : ''} not shown</p>
            )}
          </div>
        )
      })()}

      {view === 'wrenches' && (() => {
        const shown  = solutions.slice(0, MAX_SOLUTIONS_SHOWN)
        const hidden = solutions.length - shown.length
        return (
          <div className="zm-panel" key={`wr-${problem}`} style={{ '--card-accent': PROVIDER_COLOR[provider] }}>
            <h3 className="zm-panel__title">
              {problem} · top {shown.length} mitigations engineers reached for
            </h3>
            {solutions.length === 0
              ? <p className="zm-empty">No mitigations recorded for this root cause.</p>
              : (
                <>
                  <div className="zm-wrench-grid">
                    {shown.map((s, i) => {
                      const explain = MITIGATION_EXPLAIN[s.name.toLowerCase()] ?? ''
                      return (
                        <div
                          key={s.name}
                          className="zm-wrenchCard"
                          style={{ animationDelay: `${i * 22}ms` }}
                        >
                          <WrenchIcon className="zm-cardIcon" />
                          <div className="zm-cardBody">
                            <span className="zm-cardLabel">{s.name}</span>
                            {explain && <span className="zm-cardExplain">{explain}</span>}
                          </div>
                          <span className="zm-cardCount">×{s.count}</span>
                        </div>
                      )
                    })}
                  </div>
                  {hidden > 0 && (
                    <p className="zm-moreNote">+ {hidden} less frequent mitigation{hidden !== 1 ? 's' : ''} not shown</p>
                  )}
                </>
              )
            }
          </div>
        )
      })()}
    </section>
  )
}
