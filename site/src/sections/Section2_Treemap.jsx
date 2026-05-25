import { useState, useMemo } from 'react'
import './Section2_Treemap.css'

const PROVIDERS = ['AWS', 'Google', 'Azure']
const PROVIDER_COLOR = {
  AWS:    'var(--aws)',
  Google: 'var(--google)',
  Azure:  'var(--azure)',
}
const PROVIDER_LABEL = {
  AWS:    'Amazon Web Services',
  Google: 'Google Cloud',
  Azure:  'Microsoft Azure',
}

const CloudIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 16" fill="currentColor">
    <path d="M19.5 15.5h-13c-2.5 0-4.5-2-4.5-4.5 0-2.3 1.7-4.2 4-4.5C6.4 3.7 8.9 1.5 12 1.5c2.8 0 5.2 1.8 6 4.4.2 0 .3-.1.5-.1 2.5 0 4.5 2 4.5 4.5 0 2.5-2 4.5-4.5 4.5z"/>
  </svg>
)

const BugIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2l1.88 1.88" />
    <path d="M14.12 3.88L16 2" />
    <path d="M9 7.13a3 3 0 0 1 6 0v1" />
    <rect x="7" y="8" width="10" height="13" rx="5" fill="currentColor" fillOpacity="0.18" />
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

function mulberry32(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function scatter(count, seedStr) {
  let seed = 0
  for (let i = 0; i < seedStr.length; i++) seed = ((seed << 5) - seed + seedStr.charCodeAt(i)) | 0
  const rand = mulberry32(Math.abs(seed) || 1)
  const cols = Math.max(3, Math.ceil(Math.sqrt(count * 1.8)))
  const rows = Math.ceil(count / cols)
  const arr = []
  for (let i = 0; i < count; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const baseX = (col + 0.5) / cols
    const baseY = (row + 0.5) / rows
    const jX = (rand() - 0.5) * 0.55 / cols
    const jY = (rand() - 0.5) * 0.55 / rows
    arr.push({
      x: Math.max(0.08, Math.min(0.92, baseX + jX)) * 100,
      y: Math.max(0.18, Math.min(0.85, baseY + jY)) * 100,
    })
  }
  return arr
}

function sizingFor(count) {
  if (count <= 6)  return 'lg'
  if (count <= 14) return 'md'
  return 'sm'
}

export default function Section2_Treemap({ incidents }) {
  const [view, setView] = useState('clouds')
  const [provider, setProvider] = useState(null)
  const [problem, setProblem] = useState(null)
  const [zoom, setZoom] = useState(null)

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
    }, 520)
  }

  const pickProblem = (name) => {
    if (zoom) return
    setZoom({ kind: 'bug', target: name })
    setTimeout(() => {
      setProblem(name)
      setView('wrenches')
      setZoom(null)
    }, 520)
  }

  const resetToClouds = () => {
    setView('clouds'); setProvider(null); setProblem(null)
  }
  const backToBugs = () => {
    setView('bugs'); setProblem(null)
  }

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
          <button className="cs-crumb" onClick={resetToClouds}>← Pick another cloud</button>
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

      <div className="cs-stage">
        {view === 'clouds' && (
          <div className="zm-clouds" key="clouds">
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
                >
                  <CloudIcon className="zm-cloud__svg" />
                  <span className="zm-cloud__sub">{PROVIDER_LABEL[p]}</span>
                  <span className="zm-cloud__name">{p}</span>
                  <span className="zm-cloud__count">{byProvider[p].length} incidents</span>
                </button>
              )
            })}
          </div>
        )}

        {view === 'bugs' && (() => {
          const positions = scatter(problems.length, provider)
          const sz = sizingFor(problems.length)
          return (
            <div
              className="zm-scatter zm-scatter--bugs"
              key={`bugs-${provider}`}
              style={{ '--card-accent': PROVIDER_COLOR[provider] }}
            >
              <h3 className="zm-stageTitle" style={{ color: PROVIDER_COLOR[provider] }}>
                Inside {provider}'s cloud · {problems.length} kinds of bugs
              </h3>
              {problems.map((p, i) => {
                const zoomingThis  = zoom?.kind === 'bug' && zoom.target === p.name
                const fadingOthers = zoom?.kind === 'bug' && zoom.target !== p.name
                return (
                  <button
                    key={p.name}
                    className={`zm-bug zm-bug--${sz}
                                ${zoomingThis ? 'is-zooming' : ''}
                                ${fadingOthers ? 'is-fading' : ''}`}
                    style={{
                      left: `${positions[i].x}%`,
                      top: `${positions[i].y}%`,
                      animationDelay: `${i * 35}ms`,
                    }}
                    onClick={() => pickProblem(p.name)}
                    disabled={!!zoom}
                  >
                    <BugIcon className="zm-icon" />
                    <span className="zm-label">{p.name}</span>
                    <span className="zm-count">×{p.count}</span>
                  </button>
                )
              })}
            </div>
          )
        })()}

        {view === 'wrenches' && (() => {
          if (solutions.length === 0) {
            return (
              <div className="zm-scatter zm-scatter--wrenches"
                   key={`wr-${problem}-empty`}
                   style={{ '--card-accent': PROVIDER_COLOR[provider] }}>
                <h3 className="zm-stageTitle" style={{ color: PROVIDER_COLOR[provider] }}>
                  {problem}
                </h3>
                <p className="zm-empty">No mitigations were recorded for this root cause.</p>
              </div>
            )
          }
          const positions = scatter(solutions.length, `${provider}-${problem}`)
          const sz = sizingFor(solutions.length)
          return (
            <div
              className="zm-scatter zm-scatter--wrenches"
              key={`wr-${problem}`}
              style={{ '--card-accent': PROVIDER_COLOR[provider] }}
            >
              <h3 className="zm-stageTitle" style={{ color: PROVIDER_COLOR[provider] }}>
                {problem} · {solutions.length} mitigation{solutions.length === 1 ? '' : 's'} engineers reached for
              </h3>
              {solutions.map((s, i) => (
                <div
                  key={s.name}
                  className={`zm-wrench zm-wrench--${sz}`}
                  style={{
                    left: `${positions[i].x}%`,
                    top: `${positions[i].y}%`,
                    animationDelay: `${i * 35}ms`,
                  }}
                >
                  <WrenchIcon className="zm-icon" />
                  <span className="zm-label">{s.name}</span>
                  <span className="zm-count">×{s.count}</span>
                </div>
              ))}
            </div>
          )
        })()}
      </div>
    </section>
  )
}
