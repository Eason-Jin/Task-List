import React from 'react'
import './ThemeToggle.css'

const OPTIONS = [
  { value: 'light', label: 'Light', icon: '☀' },
  { value: 'dark', label: 'Dark', icon: '☾' },
  { value: 'system', label: 'System', icon: '⌘' }
]

const ThemeToggle = ({ theme, onChange }) => (
  <div className="theme" role="radiogroup" aria-label="Colour theme">
    {OPTIONS.map(option => (
      <button
        key={option.value}
        type="button"
        role="radio"
        aria-checked={theme === option.value}
        className={`theme__option${theme === option.value ? ' theme__option--on' : ''}`}
        onClick={() => onChange(option.value)}
        title={option.label}
      >
        <span aria-hidden="true">{option.icon}</span>
        <span className="visually-hidden">{option.label}</span>
      </button>
    ))}
  </div>
)

export default ThemeToggle
