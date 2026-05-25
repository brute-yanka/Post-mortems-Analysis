import './App.css'
import { useIncidents } from './data/useIncidents.js'
import Disclaimer from './components/Disclaimer.jsx'
import Reveal from './components/Reveal.jsx'
import Section0_Overview from './sections/Section0_Overview.jsx'
import Section1_Timeline from './sections/Section1_Timeline.jsx'
import Section4_AreaChart from './sections/Section4_AreaChart.jsx'
import Section2_Treemap from './sections/Section2_Treemap.jsx'
import Section3_HumanError from './sections/Section3_HumanError.jsx'

export default function App() {
  const { loading, error, incidents } = useIncidents()

  if (loading) return <div className="status">Loading incidents…</div>
  if (error) return <div className="status status--err">Failed to load data: {error.message}</div>

  return (
    <main className="storyboard">
      <header className="hero">
        <div className="hero__kicker">
          <p className="kicker">AWS · Google Cloud · Azure · 2011 - 2021</p>
          <Disclaimer />
        </div>
        <h1>When the Cloud falls...</h1>
        <p className="dek">
          Every major cloud provider publishes post-mortems after a significant outage - candid accounts of what broke, why, and how engineers responded.
          We used a <a href="https://github.com/IntelligentDDS/Post-mortems-Analysis" target="_blank" rel="noopener noreferrer">collection of {incidents.length} post-mortems</a>. Here is what a decade of failures looks like when you read them all at once.
        </p>
      </header>

      <Reveal direction="top" delay={160}><Section0_Overview incidents={incidents} /></Reveal>
      <Reveal direction="right" delay={240}><Section1_Timeline incidents={incidents} /></Reveal>
      <Reveal direction="left" delay={320}><Section2_Treemap incidents={incidents} /></Reveal>
      <Reveal direction="right" delay={400}><Section3_HumanError incidents={incidents} /></Reveal>
      <Reveal direction="bottom" delay={480}><Section4_AreaChart incidents={incidents} /></Reveal>

      <footer className="footer">
        <p>
          Data:{' '}
          <a href="https://github.com/IntelligentDDS/Post-mortems-Analysis"
             target="_blank" rel="noopener noreferrer">
            IntelligentDDS / Post-mortems-Analysis
          </a>
          {' '}- public post-mortems from AWS, Google Cloud, and Microsoft Azure, 2011 - 2021.
        </p>
        <p className="footer__copy">© 2026 Anis Kadem & Péter Ónadi · Data Visualization storyboard</p>
      </footer>
    </main>
  )
}
