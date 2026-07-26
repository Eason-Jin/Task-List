import React, { useEffect, useRef, useState } from 'react'
import './TaskEditor.css'
import { DAYS, formatHour, hourRange } from '../../lib/constants'

/**
 * Uses a native <dialog> so focus trapping, Escape, and the backdrop come from
 * the platform rather than hand-rolled listeners.
 */
const TaskEditor = ({ task, settings, onSave, onClose }) => {
  const dialogRef = useRef(null)
  const inputRef = useRef(null)
  const [title, setTitle] = useState('')
  const [day, setDay] = useState('')
  const [hour, setHour] = useState('')
  const [endHour, setEndHour] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (task) {
      setTitle(task.title)
      setDay(task.day ?? '')
      setHour(task.hour === null ? '' : String(task.hour))
      setEndHour(task.hour === null ? '' : String(task.endHour ?? task.hour + 1))
      if (!dialog.open) dialog.showModal()
      inputRef.current?.select()
    } else if (dialog.open) {
      dialog.close()
    }
  }, [task])

  /** Keep the end after the start; an empty start means unscheduled. */
  const handleStartChange = value => {
    setHour(value)
    if (value === '') {
      setEndHour('')
      return
    }
    const start = Number(value)
    if (endHour === '' || Number(endHour) <= start) setEndHour(String(start + 1))
  }

  const save = event => {
    event.preventDefault()
    const trimmed = title.trim()
    if (trimmed === '') {
      inputRef.current?.focus()
      return
    }
    const start = hour === '' ? null : Number(hour)
    onSave({
      id: task.id,
      title: trimmed,
      day: day === '' ? null : day,
      hour: start,
      endHour: start === null ? null : endHour === '' ? start + 1 : Number(endHour)
    })
  }

  return (
    <dialog ref={dialogRef} className="editor" onClose={onClose} aria-label="Edit task">
      <form className="editor__form" onSubmit={save}>
        <h2 className="editor__title">Edit task</h2>

        <label className="editor__label">
          Task
          <input
            ref={inputRef}
            type="text"
            className="field"
            value={title}
            onChange={event => setTitle(event.target.value)}
          />
        </label>

        <label className="editor__label">
          Day
          <select className="field" value={day} onChange={event => setDay(event.target.value)}>
            <option value="">Unscheduled</option>
            {DAYS.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>

        <div className="editor__pair">
          <label className="editor__label">
            From
            <select
              className="field"
              value={hour}
              onChange={event => handleStartChange(event.target.value)}
            >
              <option value="">Unscheduled</option>
              {hourRange(settings.startHour, settings.endHour).map(h => (
                <option key={h} value={h}>
                  {formatHour(h)}
                </option>
              ))}
            </select>
          </label>
          <label className="editor__label">
            To
            <select
              className="field"
              value={endHour}
              disabled={hour === ''}
              onChange={event => setEndHour(event.target.value)}
            >
              {hour === '' ? (
                <option value="">—</option>
              ) : (
                hourRange(Number(hour) + 1, settings.endHour + 1).map(h => (
                  <option key={h} value={h}>
                    {formatHour(h)}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>

        <div className="editor__actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary">
            Save
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default TaskEditor
