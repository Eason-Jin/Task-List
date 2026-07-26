import React, { useRef } from 'react'
import './TaskChip.css'
import { formatHour, formatRange, SHORT_DAYS, spanOf } from '../../lib/constants'

export const DRAG_TYPE = 'text/task-id'

/**
 * dataTransfer *values* are unreadable during dragover — only the list of types
 * is exposed — so the task's length rides along in the type name itself. That
 * lets the grid preview the whole block as you drag, and works no matter which
 * component the drag started from.
 */
export const SPAN_TYPE = 'text/task-span-'

export const spanFromTypes = types => {
  const match = Array.from(types ?? []).find(type => type.startsWith(SPAN_TYPE))
  return Math.max(1, Number(match?.slice(SPAN_TYPE.length)) || 1)
}

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

  /**
   * The resize strip lives inside the draggable chip, so pressing it would
   * otherwise start a native drag as soon as the pointer moved — the task would
   * follow the cursor instead of stretching. A ref rather than state because the
   * dragstart guard has to see the flag synchronously, before the browser has
   * committed to the drag.
   */
  const resizingRef = useRef(false)

  const handleResizePointerDown = event => {
    // Keep the cell underneath from starting a range selection, and suppress the
    // compatibility mousedown that kicks off drag detection.
    event.stopPropagation()
    event.preventDefault()
    resizingRef.current = true

    const clear = () => {
      resizingRef.current = false
    }
    window.addEventListener('pointerup', clear, { once: true })
    window.addEventListener('pointercancel', clear, { once: true })

    onResizeStart(task, event)
  }

  const handleDragStart = event => {
    if (resizingRef.current) {
      // A resize is in progress: refuse the drag outright.
      event.preventDefault()
      return
    }
    event.dataTransfer.setData(DRAG_TYPE, task.id)
    event.dataTransfer.setData(`${SPAN_TYPE}${Math.max(1, spanOf(task))}`, '')
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
          // The title clamps to a couple of lines and never breaks mid-word, so
          // the full text has to be reachable on hover.
          title={`${task.title}${task.hour === null ? '' : ` · ${time}`}`}
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
          onPointerDown={handleResizePointerDown}
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
