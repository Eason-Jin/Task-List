import React, { useCallback, useEffect, useRef, useState } from 'react'
import './TimeTable.css'
import TaskChip, { DRAG_TYPE, spanFromTypes } from '../TaskChip/TaskChip'
import { DAYS, SHORT_DAYS, formatHour, hourRange } from '../../lib/constants'

const todayName = () => DAYS[(new Date().getDay() + 6) % 7]

/**
 * A lane narrower than this has no room for a title: the chip spends ~65px on
 * fixed chrome (accent border, padding, checkbox, delete button, gaps) before any
 * text. Rather than squeezing lanes, a day with overlapping tasks widens its own
 * column and the grid scrolls horizontally.
 */
const MIN_LANE = 124
const MIN_DAY = 132

const columnTemplate = layout =>
  [
    'var(--time-col)',
    ...DAYS.map(day => {
      const lanes = layout.get(day)?.lanes ?? 1
      return `minmax(${Math.max(MIN_DAY, lanes * MIN_LANE)}px, 1fr)`
    })
  ].join(' ')

/**
 * The whole week is one CSS grid: row 1 is the header, then one row per hour.
 * Background cells and task blocks are placed into the same grid explicitly,
 * which is what lets a task span several hours by spanning rows.
 *
 * Two pointer gestures are handled here:
 *  - dragging across empty cells selects an hour range and pre-fills the composer
 *  - dragging a task's bottom edge resizes it live
 * Both work by reading which background cell the pointer is over, so neither has
 * to do any pixel maths. Task blocks get `pointer-events: none` while a gesture
 * is in flight so the cells underneath stay reachable.
 */
const TimeTable = ({ settings, layout, onDrop, onResize, onCreate, taskProps }) => {
  const hours = hourRange(settings.startHour, settings.endHour)
  const today = todayName()

  const [gesture, setGesture] = useState(null)
  const [dropPreview, setDropPreview] = useState(null)
  const [dragging, setDragging] = useState(false)
  const gestureRef = useRef(null)
  gestureRef.current = gesture

  // Bound unconditionally rather than only while a gesture runs, so a very fast
  // click cannot release before the listener is attached. A plain click ends up
  // here too, which is how single-slot creation works.
  useEffect(() => {
    const finish = () => {
      const active = gestureRef.current
      if (!active) return
      gestureRef.current = null
      setGesture(null)
      if (active.kind === 'select') onCreate(active.day, active.from, active.to + 1)
    }
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
    return () => {
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
    }
  }, [onCreate])

  // A drag can end anywhere, including outside the grid or on Escape, and a
  // dragend from an Inbox chip never bubbles through here. Window-level cleanup
  // guarantees the preview and the inert-blocks class do not get stuck on.
  useEffect(() => {
    const clear = () => {
      setDragging(false)
      setDropPreview(null)
    }
    window.addEventListener('dragend', clear)
    window.addEventListener('drop', clear)
    return () => {
      window.removeEventListener('dragend', clear)
      window.removeEventListener('drop', clear)
    }
  }, [])

  const startSelect = (day, hour) => event => {
    // Touch needs the vertical drag for scrolling, so it falls back to a tap.
    if (event.button !== 0 || event.pointerType === 'touch') return
    setGesture({ kind: 'select', day, anchor: hour, from: hour, to: hour })
  }

  const startResize = useCallback((task, event) => {
    if (event.button !== 0) return
    setGesture({ kind: 'resize', id: task.id, day: task.day, hour: task.hour })
  }, [])

  const enterCell = (day, hour) => () => {
    const active = gestureRef.current
    if (!active) return
    if (active.kind === 'select') {
      if (active.day !== day) return
      setGesture({
        ...active,
        from: Math.min(active.anchor, hour),
        to: Math.max(active.anchor, hour)
      })
    } else if (active.kind === 'resize' && active.day === day && hour >= active.hour) {
      onResize(active.id, hour + 1)
    }
  }

  const handleDragOver = (day, hour) => event => {
    const { types } = event.dataTransfer
    if (!types.includes(DRAG_TYPE)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropPreview(prev =>
      prev && prev.day === day && prev.hour === hour
        ? prev
        : { day, hour, span: spanFromTypes(types) }
    )
  }

  const handleDrop = (day, hour) => event => {
    const id = event.dataTransfer.getData(DRAG_TYPE)
    if (!id) return
    event.preventDefault()
    setDropPreview(null)
    onDrop(id, day, hour)
  }

  /**
   * Where the dragged task would land: the hovered cell plus however many hours
   * the task runs for, since dropping preserves its length.
   */
  const dropEdge = (day, hour) => {
    if (!dropPreview || dropPreview.day !== day) return ''
    const { hour: start, span } = dropPreview
    if (hour < start || hour >= start + span) return ''
    let cls = ' grid__cell--over'
    if (hour === start) cls += ' grid__cell--over-first'
    if (hour === start + span - 1) cls += ' grid__cell--over-last'
    return cls
  }

  const inSelection = (day, hour) =>
    gesture &&
    gesture.kind === 'select' &&
    gesture.day === day &&
    hour >= gesture.from &&
    hour <= gesture.to

  return (
    <div className="grid-wrap">
      <div
        className={`grid${gesture || dragging ? ' grid--busy' : ''}`}
        role="grid"
        aria-label="Weekly schedule"
        style={{ '--rows': hours.length, gridTemplateColumns: columnTemplate(layout) }}
        // dragenter rather than dragstart, so a task dragged in from the Inbox
        // also makes the blocks inert and keeps the cells under them droppable.
        onDragEnter={() => setDragging(true)}
        // Clearing only when the pointer leaves the grid entirely: a per-cell
        // dragleave fires after the next cell's dragover and would flicker.
        onDragLeave={event => {
          if (!event.currentTarget.contains(event.relatedTarget)) setDropPreview(null)
        }}
      >
        <div className="grid__corner" role="columnheader" style={{ gridColumn: 1, gridRow: 1 }}>
          <span className="visually-hidden">Time</span>
        </div>

        {DAYS.map((day, col) => (
          <div
            key={day}
            className={`grid__day${day === today ? ' grid__day--today' : ''}`}
            role="columnheader"
            style={{ gridColumn: col + 2, gridRow: 1 }}
          >
            <span className="grid__day-long">{day}</span>
            <span className="grid__day-short">{SHORT_DAYS[day]}</span>
          </div>
        ))}

        {hours.map((hour, row) => (
          <div
            key={`t${hour}`}
            className="grid__time"
            role="rowheader"
            style={{ gridColumn: 1, gridRow: row + 2 }}
          >
            {formatHour(hour)}
          </div>
        ))}

        {hours.map((hour, row) =>
          DAYS.map((day, col) => (
            <div
              key={`${day}|${hour}`}
              className={`grid__cell${
                inSelection(day, hour) ? ' grid__cell--picked' : ''
              }${dropEdge(day, hour)}`}
              role="gridcell"
              aria-label={`${day} ${formatHour(hour)}`}
              style={{ gridColumn: col + 2, gridRow: row + 2 }}
              onPointerDown={startSelect(day, hour)}
              onPointerEnter={enterCell(day, hour)}
              onDragOver={handleDragOver(day, hour)}
              onDrop={handleDrop(day, hour)}
            />
          ))
        )}

        {DAYS.map((day, col) => {
          const dayLayout = layout.get(day)
          if (!dayLayout) return null
          return dayLayout.items.map(({ task, lane }) => {
            const row = task.hour - settings.startHour + 2
            // Never spill past the last row, however long the task is.
            const span = Math.min(
              (task.endHour ?? task.hour + 1) - task.hour,
              settings.endHour - task.hour + 1
            )
            return (
              <div
                key={task.id}
                className="grid__task"
                style={{
                  gridColumn: col + 2,
                  gridRow: `${row} / span ${Math.max(1, span)}`,
                  '--lane': lane,
                  '--lanes': dayLayout.lanes
                }}
              >
                <TaskChip task={task} onResizeStart={startResize} {...taskProps} />
              </div>
            )
          })
        })}
      </div>
    </div>
  )
}

export default TimeTable
