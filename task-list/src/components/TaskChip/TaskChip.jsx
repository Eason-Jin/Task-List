import React from 'react'
import './TaskChip.css'
import { formatHour, formatRange, SHORT_DAYS } from '../../lib/constants'

export const DRAG_TYPE = 'text/task-id'

const HOUR_KEYS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1]
}

/**
 * A single task. Drag moves it, dragging the bottom edge lengthens it, and
 * Ctrl/Cmd + arrows do the move from the keyboard since HTML5 drag and drop is
 * pointer-only. Shift + up/down adjusts the end hour for the same reason.
 */
const TaskChip = ({
  task,
  onComplete,
  onDelete,
  onEdit,
  onNudge,
  onResize,
  onResizeStart,
  showMeta = false
}) => {
  const duration = task.hour === null ? 0 : (task.endHour ?? task.hour + 1) - task.hour

  const handleKeyDown = event => {
    if (event.key === 'Enter') {
      event.preventDefault()
      onEdit(task)
      return
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      onDelete(task)
      return
    }

    // Shift + up/down changes how long the task is.
    if (event.shiftKey && onResize && task.hour !== null) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        onResize(task.id, task.hour + duration + 1)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        onResize(task.id, task.hour + duration - 1)
        return
      }
    }

    if (!onNudge || !(event.ctrlKey || event.metaKey)) return
    const delta = HOUR_KEYS[event.key]
    if (!delta) return
    event.preventDefault()
    onNudge(task, delta[0], delta[1])
  }

  const handleDragStart = event => {
    event.dataTransfer.setData(DRAG_TYPE, task.id)
    event.dataTransfer.effectAllowed = 'move'
    event.currentTarget.classList.add('chip--dragging')
  }

  const handleDragEnd = event => {
    event.currentTarget.classList.remove('chip--dragging')
  }

  const time = formatRange(task.hour, task.endHour)
  const meta =
    task.day || task.hour !== null
      ? [task.day ? SHORT_DAYS[task.day] : null, task.hour !== null ? time : null]
          .filter(Boolean)
          .join(' · ')
      : 'Unscheduled'

  return (
    <div
      className={`chip${duration > 1 ? ' chip--long' : ''}`}
      draggable
      tabIndex={0}
      role="group"
      aria-label={`${task.title}, ${meta}`}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onKeyDown={handleKeyDown}
      onDoubleClick={() => onEdit(task)}
    >
      <div className="chip__body">
        <input
          type="checkbox"
          className="chip__check"
          checked={false}
          onChange={() => onComplete(task)}
          aria-label={`Mark "${task.title}" complete`}
        />
        <button
          type="button"
          className="chip__title"
          onClick={() => onEdit(task)}
          aria-label={`Edit "${task.title}"`}
        >
          <span className="chip__text">{task.title}</span>
          {(showMeta || duration > 1) && <span className="chip__meta">{showMeta ? meta : time}</span>}
        </button>
        <button
          type="button"
          className="chip__delete"
          onClick={() => onDelete(task)}
          aria-label={`Delete "${task.title}"`}
          title="Delete"
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
      </div>

      {onResizeStart && task.hour !== null && (
        <div
          className="chip__resize"
          onPointerDown={event => {
            // Stop the cell underneath from starting a range selection.
            event.stopPropagation()
            onResizeStart(task, event)
          }}
          aria-hidden="true"
          title={`Drag to change the end time (currently ${formatHour(
            task.endHour ?? task.hour + 1
          )})`}
        />
      )}
    </div>
  )
}

export default TaskChip
