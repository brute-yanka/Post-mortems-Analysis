import Tooltip from './Tooltip.jsx'
import './Disclaimer.css'

const DISCLAIMER_TEXT = 'A note on what these numbers mean. This dataset counts publicly disclosed post-mortems - not every outage that happened. Differences between providers reflect what they chose to publish, not which service is more reliable. Read each panel as one provider\'s story over time, not as a head-to-head.'

export default function Disclaimer() {
  return (
    <Tooltip label={DISCLAIMER_TEXT}>
      <span className="disclaimer__icon" role="img" aria-label="Dataset note">!</span>
    </Tooltip>
  )
}
