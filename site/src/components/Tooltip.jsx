import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './Tooltip.css'

export default function Tooltip({ label, children }) {
  const triggerRef = useRef(null)
  const [pos, setPos] = useState(null)

  const show = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPos({ x: rect.left + rect.width / 2, y: rect.top })
  }
  const hide = () => setPos(null)

  return (
    <>
      <span
        ref={triggerRef}
        className="tt-wrap"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        tabIndex={0}
      >
        {children}
      </span>
      {pos && createPortal(
        <span
          className="tt-bubble"
          role="tooltip"
          style={{ left: pos.x, top: pos.y }}
        >
          {label}
        </span>,
        document.body,
      )}
    </>
  )
}
