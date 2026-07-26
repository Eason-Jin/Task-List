import React, { useEffect, useRef } from 'react'
import './SettingsDialog.css'
import ThemeToggle from '../ThemeToggle/ThemeToggle'
import { MAX_HOUR, MIN_HOUR, formatHour, formatRange, hourRange } from '../../lib/constants'
import { tasksOutsideRange } from '../../hooks/useTasks'

/**
 * Theme and the visible hours of the day.
 *
 * Changes apply immediately so the grid behind updates as you pick, and the
 * warning below lists any task the current range would push off the grid. It
 * warns rather than blocks: nothing is deleted, and widening the range brings
 * everything straight back.
 */
const SettingsDialog = ({ open, settings, tasks, onChange, onClose }) => {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      if (!dialog.open) dialog.showModal()
    } else if (dialog.open) {
      dialog.close()
    }
  }, [open])

  const { startHour, endHour, theme } = settings
  const outside = tasksOutsideRange(tasks, startHour, endHour)

  const handleStart = value => {
    const next = Number(value)
    // Keep the day at least one hour long.
    onChange({ startHour: next, endHour: Math.max(next, endHour) })
  }

  const handleEnd = value => {
    onChange({ endHour: Number(value) })
  }

  return (
    <dialog
      ref={dialogRef}
      className="settings"
      onClose={onClose}
      aria-labelledby="settings-title"
    >
      <div className="settings__inner">
        <header className="settings__head">
          <h2 className="settings__title" id="settings-title">
            Settings
          </h2>
          <button
            type="button"
            className="settings__close"
            onClick={onClose}
            aria-label="Close settings"
          >
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </button>
        </header>

        <section className="settings__group">
          <h3 className="settings__label">Appearance</h3>
          <ThemeToggle theme={theme} onChange={value => onChange({ theme: value })} />
        </section>

        <section className="settings__group">
          <h3 className="settings__label">Hours shown</h3>
          <div className="settings__range">
            <label className="settings__field">
              <span>Day starts</span>
              <select
                className="field"
                value={startHour}
                onChange={event => handleStart(event.target.value)}
              >
                {hourRange(MIN_HOUR, MAX_HOUR).map(hour => (
                  <option key={hour} value={hour}>
                    {formatHour(hour)}
                  </option>
                ))}
              </select>
            </label>
            <label className="settings__field">
              <span>Day ends</span>
              <select
                className="field"
                value={endHour}
                onChange={event => handleEnd(event.target.value)}
              >
                {hourRange(startHour, MAX_HOUR).map(hour => (
                  <option key={hour} value={hour}>
                    {formatHour(hour)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="settings__hint">
            The last row is {formatHour(endHour)}, so a task can run until{' '}
            {formatHour(endHour + 1)}.
          </p>
        </section>

        {outside.length > 0 && (
          <section className="settings__warn" role="alert">
            <p className="settings__warn-lead">
              {outside.length === 1
                ? '1 task falls outside these hours and is hidden from the grid:'
                : `${outside.length} tasks fall outside these hours and are hidden from the grid:`}
            </p>
            <ul className="settings__warn-list">
              {outside.map(task => (
                <li key={task.id}>
                  <strong>{task.title}</strong> — {task.day}, {formatRange(task.hour, task.endHour)}
                </li>
              ))}
            </ul>
            <p className="settings__warn-foot">
              Nothing has been deleted. Widen the range to bring them back.
            </p>
          </section>
        )}

        <div className="settings__actions">
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </dialog>
  )
}

export default SettingsDialog
