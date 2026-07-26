import React, { useEffect, useRef, useState } from 'react'
import './Composer.css'
import { DAYS, formatHour, hourRange } from '../../lib/constants'

/**
 * Replaces the old TaskInput. Day and times are optional: leaving them blank
 * files the task under Unscheduled instead of losing it, which is what the v1
 * app did silently.
 */
const Composer = ({ settings, onAdd, onCompleteAll, onClearAll, defaults, taskCount = 0 }) => {
  const [title, setTitle] = useState('')
  const [day, setDay] = useState('')
  const [hour, setHour] = useState('')
  const [endHour, setEndHour] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const starts = hourRange(settings.startHour, settings.endHour)
  // End hours are exclusive, so the last option is one past the final row.
  const ends = hourRange(settings.startHour + 1, settings.endHour + 1)

  // Selecting or sweeping cells in the grid pre-fills the composer.
  useEffect(() => {
    if (!defaults) return
    setDay(defaults.day ?? '')
    setHour(defaults.hour === null || defaults.hour === undefined ? '' : String(defaults.hour))
    setEndHour(
      defaults.endHour === null || defaults.endHour === undefined ? '' : String(defaults.endHour)
    )
    inputRef.current?.focus()
  }, [defaults])

  /** Keep the end after the start; an empty end means a one-hour task. */
  const handleStartChange = value => {
    setHour(value)
    if (value === '') {
      setEndHour('')
      return
    }
    const start = Number(value)
    if (endHour === '' || Number(endHour) <= start) setEndHour(String(start + 1))
  }

  const submit = () => {
    const trimmed = title.trim()
    if (trimmed === '') {
      setError('Enter a task first.')
      inputRef.current?.focus()
      return
    }
    const start = hour === '' ? null : Number(hour)
    onAdd({
      title: trimmed,
      day: day === '' ? null : day,
      hour: start,
      endHour: start === null ? null : endHour === '' ? start + 1 : Number(endHour)
    })
    setTitle('')
    setError('')
  }

  const handleKeyDown = event => {
    if (event.key === 'Enter') {
      event.preventDefault()
      submit()
    } else if (event.key === 'Escape') {
      setTitle('')
      setError('')
    }
  }

  return (
    <div className="composer">
      <div className="composer__row">
        <input
          ref={inputRef}
          type="text"
          className="field composer__title"
          placeholder="What needs doing?"
          value={title}
          aria-label="Task"
          aria-invalid={error !== ''}
          onChange={event => {
            setTitle(event.target.value)
            if (error) setError('')
          }}
          onKeyDown={handleKeyDown}
        />
        <select
          className="field composer__select"
          value={day}
          aria-label="Day"
          onChange={event => setDay(event.target.value)}
        >
          <option value="">Any day</option>
          {DAYS.map(d => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <div className="composer__times">
          <select
            className="field composer__select"
            value={hour}
            aria-label="Start time"
            onChange={event => handleStartChange(event.target.value)}
          >
            <option value="">Any time</option>
            {starts.map(h => (
              <option key={h} value={h}>
                {formatHour(h)}
              </option>
            ))}
          </select>
          <span className="composer__to" aria-hidden="true">
            to
          </span>
          <select
            className="field composer__select"
            value={endHour}
            aria-label="End time"
            disabled={hour === ''}
            onChange={event => setEndHour(event.target.value)}
          >
            {hour === '' ? (
              <option value="">—</option>
            ) : (
              ends
                .filter(h => h > Number(hour))
                .map(h => (
                  <option key={h} value={h}>
                    {formatHour(h)}
                  </option>
                ))
            )}
          </select>
        </div>

        <button type="button" className="btn btn--primary" onClick={submit}>
          Add task
        </button>
        <button
          type="button"
          className="btn"
          onClick={onCompleteAll}
          disabled={taskCount === 0}
          title="Tick off every task on the schedule"
        >
          Complete all
        </button>
        <button
          type="button"
          className="btn btn--danger composer__clear"
          onClick={onClearAll}
          disabled={taskCount === 0}
        >
          Clear all
        </button>
      </div>
      <p className="composer__hint" role="status">
        {error ||
          'Press Enter to add. Drag down the calendar to block out a range, drag a task’s bottom edge to stretch it.'}
      </p>
    </div>
  )
}

export default Composer
