import React, { useEffect, useRef, useState } from 'react'
import './SettingsDialog.css'
import ThemeToggle from '../ThemeToggle/ThemeToggle'
import { MAX_HOUR, MIN_HOUR, formatHour, formatRange, hourRange } from '../../lib/constants'
import { tasksOutsideRange } from '../../hooks/useTasks'

/**
 * Theme and the visible hours of the day.
 *
 * Everything is edited as a draft and only committed on Save, so Cancel is a true
 * undo. Saving is refused while any task would fall outside the chosen range —
 * the warning names them so they can be moved or the range widened.
 */
const SettingsDialog = ({ open, settings, tasks, onSave, onClose }) => {
  const dialogRef = useRef(null)
  const [draft, setDraft] = useState(settings)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open) {
      // Start from the saved values every time it opens, discarding any edits
      // abandoned last time.
      setDraft(settings)
      if (!dialog.open) dialog.showModal()
    } else if (dialog.open) {
      dialog.close()
    }
    // Intentionally keyed on `open` alone: re-syncing on every settings change
    // would fight with the draft being edited.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const outside = tasksOutsideRange(tasks, draft.startHour, draft.endHour)
  const blocked = outside.length > 0

  const setStart = value => {
    const startHour = Number(value)
    // Keep the day at least one hour long.
    setDraft(prev => ({ ...prev, startHour, endHour: Math.max(startHour, prev.endHour) }))
  }

  return (
    <dialog
      ref={dialogRef}
      className="settings"
      onClose={onClose}
      aria-labelledby="settings-title"
    >
      <div className="settings__inner">
        <h2 className="settings__title" id="settings-title">
          Settings
        </h2>

        <section className="settings__group">
          <h3 className="settings__label">Appearance</h3>
          <ThemeToggle
            theme={draft.theme}
            onChange={theme => setDraft(prev => ({ ...prev, theme }))}
          />
        </section>

        <section className="settings__group">
          <h3 className="settings__label">Hours shown</h3>
          <div className="settings__range">
            <label className="settings__field">
              <span>Day starts</span>
              <select
                className="field"
                value={draft.startHour}
                onChange={event => setStart(event.target.value)}
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
                value={draft.endHour}
                onChange={event =>
                  setDraft(prev => ({ ...prev, endHour: Number(event.target.value) }))
                }
              >
                {hourRange(draft.startHour, MAX_HOUR).map(hour => (
                  <option key={hour} value={hour}>
                    {formatHour(hour)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {blocked && (
          <section className="settings__warn" role="alert">
            <p className="settings__warn-lead">
              {outside.length === 1 ? 'This task is outside the range:' : 'These tasks are outside the range:'}
            </p>
            <ul className="settings__warn-list">
              {outside.map(task => (
                <li key={task.id}>
                  <strong>{task.title}</strong> — {task.day}, {formatRange(task.hour, task.endHour)}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="settings__actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => onSave(draft)}
            disabled={blocked}
            title={blocked ? 'Widen the range so no task falls outside it' : undefined}
          >
            Save
          </button>
        </div>
      </div>
    </dialog>
  )
}

export default SettingsDialog
