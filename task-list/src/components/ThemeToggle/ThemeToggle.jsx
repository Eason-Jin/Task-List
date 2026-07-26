import React from 'react'
import './ThemeToggle.css'

const Sun = () => (
  <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true" fill="none">
    <circle cx="10" cy="10" r="3.4" stroke="currentColor" strokeWidth="1.6" />
    <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M10 2.2v1.9M10 15.9v1.9M2.2 10h1.9M15.9 10h1.9" />
      <path d="M4.5 4.5l1.35 1.35M14.15 14.15l1.35 1.35M15.5 4.5l-1.35 1.35M5.85 14.15L4.5 15.5" />
    </g>
  </svg>
)

const Moon = () => (
  <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true" fill="none">
    <path
      d="M16 12.3A6.8 6.8 0 0 1 7.7 4a7 7 0 1 0 8.3 8.3z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
)

const Monitor = () => (
  <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true" fill="none">
    <rect
      x="2.6"
      y="3.6"
      width="14.8"
      height="10"
      rx="1.6"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <path d="M7.5 16.7h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor }
]

/** Segmented control: three equal parts, each labelled. */
const ThemeToggle = ({ theme, onChange }) => (
  <div className="theme" role="radiogroup" aria-label="Colour theme">
    {OPTIONS.map(({ value, label, Icon }) => (
      <button
        key={value}
        type="button"
        role="radio"
        aria-checked={theme === value}
        className={`theme__option${theme === value ? ' theme__option--on' : ''}`}
        onClick={() => onChange(value)}
      >
        <Icon />
        {label}
      </button>
    ))}
  </div>
)

export default ThemeToggle
