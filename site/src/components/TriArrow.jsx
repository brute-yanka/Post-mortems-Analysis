export default function TriArrow({ dir = 'right', size = 15, className }) {
  const pts = dir === 'right' ? '2,1 11,6 2,11' : '10,1 1,6 10,11'
  return (
    <svg
      viewBox="0 0 12 12"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polygon points={pts} />
    </svg>
  )
}
