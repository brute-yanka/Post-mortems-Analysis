import { useState, useMemo } from 'react'
import TriArrow from '../components/TriArrow.jsx'
import './Section2_Treemap.css'

const PROVIDERS = ['AWS', 'Google', 'Azure']
const PROVIDER_COLOR = {
  AWS:    'var(--aws)',
  Google: 'var(--google)',
  Azure:  'var(--azure)',
}
const PROVIDER_HEX = {
  AWS:    '#ff9900',
  Google: '#34a853',
  Azure:  '#00a4ef',
}

// Mitigations appearing ≤ this many times are folded into "Other"
const OTHER_THRESHOLD = 1
// Cap on root-cause nodes shown
const MAX_CAUSES = 10

// Cloud outline path, viewBox "0 0 200 120", text at (~100, 64) and (~100, 86)
const CLOUD_PATH =
  'M28,104 Q10,104 10,86 Q10,68 26,62 Q20,46 36,38 Q44,20 65,24 Q71,12 88,16 Q98,9 112,18 Q124,11 140,24 Q154,17 164,33 Q178,35 180,53 Q188,60 186,76 Q183,93 165,95 Q163,105 147,105 L28,104 Z'

// Sankey geometry
const SK_W        = 860
const SK_H        = 500
const SK_ML       = 160   // left margin for source labels
const SK_MR       = 168   // right margin for target labels
const SK_MT       = 14
const SK_MB       = 14
const SK_IW       = SK_W - SK_ML - SK_MR
const SK_IH       = SK_H - SK_MT - SK_MB
const NODE_W      = 16
const NODE_PAD    = 9     // gap between stacked nodes

// ── Sankey layout ────────────────────────────────────────────────────────────

function sankeyPath({ x0, x1, sy0, sy1, ty0, ty1 }) {
  const mx = (x0 + x1) / 2
  return [
    `M ${x0} ${sy0}`,
    `C ${mx} ${sy0}, ${mx} ${ty0}, ${x1} ${ty0}`,
    `L ${x1} ${ty1}`,
    `C ${mx} ${ty1}, ${mx} ${sy1}, ${x0} ${sy1}`,
    'Z',
  ].join(' ')
}

function computeLayout(nodes, links, W, H) {
  const src = nodes.map((n, i) => ({ ...n, i })).filter(n => n.side === 'source')
  const tgt = nodes.map((n, i) => ({ ...n, i })).filter(n => n.side === 'target')

  const outflow = new Array(nodes.length).fill(0)
  const inflow  = new Array(nodes.length).fill(0)
  for (const l of links) { outflow[l.source] += l.value; inflow[l.target] += l.value }

  function stack(items, getFlow) {
    const total = items.reduce((s, n) => s + getFlow(n.i), 0)
    const avail = H - NODE_PAD * Math.max(0, items.length - 1)
    let y = 0
    for (const n of items) {
      const h = total > 0 ? Math.max(6, (getFlow(n.i) / total) * avail) : Math.max(6, avail / items.length)
      n.y0 = y; n.y1 = y + h; y += h + NODE_PAD
    }
    const used = y - NODE_PAD
    const off  = (H - used) / 2
    if (off > 0) for (const n of items) { n.y0 += off; n.y1 += off }
  }

  stack(src, i => outflow[i])
  stack(tgt, i => inflow[i])

  const pos = []
  for (const n of src) pos[n.i] = { ...n, x0: 0,       x1: NODE_W }
  for (const n of tgt) pos[n.i] = { ...n, x0: W - NODE_W, x1: W }

  // Per-source, sort links top-to-bottom by target to reduce crossings
  const bySrc = new Map()
  for (const l of links) {
    if (!bySrc.has(l.source)) bySrc.set(l.source, [])
    bySrc.get(l.source).push(l)
  }
  for (const ls of bySrc.values())
    ls.sort((a, b) => (pos[a.target]?.y0 ?? 0) - (pos[b.target]?.y0 ?? 0))

  const tgtOff = new Array(nodes.length).fill(0)
  const renderedLinks = []

  for (const [si, ls] of bySrc) {
    const sn = pos[si]; if (!sn) continue
    const avail = sn.y1 - sn.y0
    let y = sn.y0
    for (const l of ls) {
      const tn = pos[l.target]; if (!tn) continue
      const sw = (l.value / (outflow[si]       || 1)) * avail
      const tw = (l.value / (inflow[l.target]  || 1)) * (tn.y1 - tn.y0)
      renderedLinks.push({
        ...l,
        x0: NODE_W, x1: W - NODE_W,
        sy0: y,       sy1: y + sw,
        ty0: tn.y0 + tgtOff[l.target],
        ty1: tn.y0 + tgtOff[l.target] + tw,
      })
      y += sw
      tgtOff[l.target] += tw
    }
  }

  return { pos, links: renderedLinks }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function trunc(s, n = 30) { return s.length > n ? s.slice(0, n - 1) + '…' : s }

// ── Sub-components ────────────────────────────────────────────────────────────

const CloudShape = ({ provider, count }) => (
  <svg className="zm-cloud__svg" viewBox="0 0 200 120" fill="none" aria-hidden="true">
    <path d={CLOUD_PATH} stroke="currentColor" strokeWidth="3"
          strokeLinejoin="round" strokeLinecap="round" />
    <text x="100" y="63" textAnchor="middle" dominantBaseline="middle"
          fill="currentColor" fontSize="28" fontWeight="800"
          fontFamily="ui-serif, Georgia, serif">
      {provider}
    </text>
    <text x="100" y="86" textAnchor="middle" dominantBaseline="middle"
          fill="currentColor" fontSize="13" opacity="0.75" letterSpacing="0.06em"
          fontFamily="ui-monospace, 'SF Mono', SFMono-Regular, Consolas, monospace">
      {count} incidents
    </text>
  </svg>
)

// ── Main component ────────────────────────────────────────────────────────────

export default function Section2_Treemap({ incidents }) {
  const [view, setView]         = useState('clouds')
  const [provider, setProvider] = useState(null)
  const [zoom, setZoom]         = useState(null)

  const byProvider = useMemo(() => {
    const g = { AWS: [], Google: [], Azure: [] }
    for (const inc of incidents) if (g[inc.provider]) g[inc.provider].push(inc)
    return g
  }, [incidents])

  // Build Sankey data for the selected provider
  const sankeyData = useMemo(() => {
    if (view !== 'sankey' || !provider) return null
    const provIncs = byProvider[provider]

    const pairMap   = new Map()   // `cause::mit` → count
    const causeMap  = new Map()   // cause → incident count
    const mitGlobal = new Map()   // mitigation → global count

    const NOISE = new Set(['unspecified', 'other', 'others', 'unknown', 'n/a'])
    for (const inc of provIncs) {
      const causes = inc.rootCauseL2.filter(c => !NOISE.has(c.toLowerCase()))
      if (!causes.length) continue
      const mits   = inc.mitigationActions

      const seenC = new Set()
      for (const c of causes) {
        if (!seenC.has(c)) { seenC.add(c); causeMap.set(c, (causeMap.get(c) || 0) + 1) }
      }
      for (const m of mits) mitGlobal.set(m, (mitGlobal.get(m) || 0) + 1)

      const seenP = new Set()
      for (const c of causes) for (const m of mits) {
        const k = `${c}::${m}`
        if (!seenP.has(k)) { seenP.add(k); pairMap.set(k, (pairMap.get(k) || 0) + 1) }
      }
    }

    // Mitigations to collapse into "Other"
    const otherSet = new Set(
      [...mitGlobal.entries()].filter(([, n]) => n <= OTHER_THRESHOLD).map(([m]) => m)
    )

    const topCauses   = [...causeMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_CAUSES).map(([n]) => n)
    const topCauseSet = new Set(topCauses)

    // Aggregate link values for non-Other mitigations
    const mitUsed = new Map()
    for (const [k, cnt] of pairMap) {
      const [c, m] = k.split('::')
      if (topCauseSet.has(c) && !otherSet.has(m)) mitUsed.set(m, (mitUsed.get(m) || 0) + cnt)
    }
    const topMits   = [...mitUsed.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m)
    const topMitSet = new Set(topMits)

    // Check whether any links flow to Other
    let hasOther = false
    for (const [k] of pairMap) {
      const [c, m] = k.split('::')
      if (topCauseSet.has(c) && (otherSet.has(m) || !topMitSet.has(m))) { hasOther = true; break }
    }

    // Build node list
    const nodes   = []
    const nodeIdx = new Map()
    for (const c of topCauses) { nodeIdx.set(`src::${c}`, nodes.length); nodes.push({ name: c, side: 'source' }) }
    for (const m of topMits)   { nodeIdx.set(`tgt::${m}`, nodes.length); nodes.push({ name: m, side: 'target' }) }
    if (hasOther)               { nodeIdx.set('tgt::Other', nodes.length); nodes.push({ name: 'Other', side: 'target', isOther: true }) }

    // Build links
    const otherAgg = new Map()
    const links    = []
    for (const [k, cnt] of pairMap) {
      const [c, m] = k.split('::')
      if (!topCauseSet.has(c)) continue
      const si = nodeIdx.get(`src::${c}`)
      if (otherSet.has(m) || !topMitSet.has(m)) {
        otherAgg.set(c, (otherAgg.get(c) || 0) + cnt)
      } else {
        const ti = nodeIdx.get(`tgt::${m}`)
        if (si !== undefined && ti !== undefined) links.push({ source: si, target: ti, value: cnt })
      }
    }
    if (hasOther) {
      const oi = nodeIdx.get('tgt::Other')
      for (const [c, cnt] of otherAgg) {
        const si = nodeIdx.get(`src::${c}`)
        if (si !== undefined) links.push({ source: si, target: oi, value: cnt })
      }
    }

    return { nodes, links, numCauses: topCauses.length, numMits: topMits.length + (hasOther ? 1 : 0) }
  }, [view, provider, byProvider])

  const sankeyLayout = useMemo(
    () => sankeyData ? computeLayout(sankeyData.nodes, sankeyData.links, SK_IW, SK_IH) : null,
    [sankeyData],
  )

  const maxLinkVal = useMemo(
    () => sankeyLayout ? Math.max(1, ...sankeyLayout.links.map(l => l.value)) : 1,
    [sankeyLayout],
  )

  const pickProvider = p => {
    if (zoom) return
    setZoom({ kind: 'cloud', target: p })
    setTimeout(() => { setProvider(p); setView('sankey'); setZoom(null) }, 450)
  }
  const resetToClouds = () => { setView('clouds'); setProvider(null) }

  return (
    <section className="story-section cs-section">
      <header className="section-header">
        <p className="kicker">§ 03 · Why things broke</p>
        <h2>Pick a cloud, trace the bugs</h2>
        <p className="lede">
          Each provider's root causes flow into the mitigations engineers reached for.
          Click a cloud to see the full picture. Mitigations with only one occurrence
          are folded into "Other".
        </p>
      </header>

      {view !== 'clouds' && (
        <nav className="cs-crumbs" aria-label="Breadcrumb">
          <button className="cs-crumb" onClick={resetToClouds}>
            <TriArrow dir="left" /> Pick another cloud
          </button>
        </nav>
      )}

      {/* ── Clouds view ──────────────────────────────────────────── */}
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

      {/* ── Sankey view ──────────────────────────────────────────── */}
      {view === 'sankey' && sankeyData && sankeyLayout && (
        <div className="sk-wrap" key={`sankey-${provider}`}>
          <p className="sk-meta">
            <span style={{ color: PROVIDER_COLOR[provider] }}>{provider}</span>
            {' '}· {sankeyData.numCauses} root cause{sankeyData.numCauses !== 1 ? 's' : ''}
            {' '}→{' '}
            {sankeyData.numMits} mitigation pattern{sankeyData.numMits !== 1 ? 's' : ''}
          </p>

          <svg
            viewBox={`0 0 ${SK_W} ${SK_H}`}
            className="sk-svg"
            overflow="visible"
            role="img"
            aria-label={`Sankey diagram showing root causes and mitigations for ${provider}`}
          >
            <g transform={`translate(${SK_ML},${SK_MT})`}>
              {/* Links */}
              {sankeyLayout.links.map((link, i) => (
                <path
                  key={i}
                  d={sankeyPath(link)}
                  style={{
                    fill: PROVIDER_HEX[provider],
                    fillOpacity: 0.08 + 0.42 * (link.value / maxLinkVal),
                  }}
                  className="sk-link"
                />
              ))}

              {/* Source (cause) nodes + labels */}
              {sankeyLayout.pos
                .filter(n => n?.side === 'source')
                .map(n => (
                  <g key={n.id ?? n.name}>
                    <rect
                      x={n.x0} y={n.y0}
                      width={NODE_W} height={Math.max(1, n.y1 - n.y0)}
                      style={{ fill: PROVIDER_HEX[provider] }}
                      rx={2}
                    />
                    <text
                      x={-8} y={(n.y0 + n.y1) / 2}
                      textAnchor="end" dominantBaseline="middle"
                      className="sk-label"
                    >
                      {trunc(n.name)}
                    </text>
                  </g>
                ))}

              {/* Target (mitigation) nodes + labels */}
              {sankeyLayout.pos
                .filter(n => n?.side === 'target')
                .map(n => (
                  <g key={n.id ?? n.name}>
                    <rect
                      x={n.x0} y={n.y0}
                      width={NODE_W} height={Math.max(1, n.y1 - n.y0)}
                      style={{ fill: n.isOther ? 'rgba(255,255,255,0.25)' : PROVIDER_HEX[provider] }}
                      rx={2}
                      opacity={n.isOther ? 0.6 : 0.75}
                    />
                    <text
                      x={SK_IW + 8} y={(n.y0 + n.y1) / 2}
                      textAnchor="start" dominantBaseline="middle"
                      className={`sk-label${n.isOther ? ' sk-label--other' : ''}`}
                    >
                      {trunc(n.name)}
                    </text>
                  </g>
                ))}
            </g>
          </svg>
        </div>
      )}
    </section>
  )
}
