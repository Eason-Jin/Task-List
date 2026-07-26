import { useEffect, useMemo, useReducer, useRef, useState, useCallback } from 'react'
import { createId, loadState, saveState } from '../lib/storage'
import { DAYS, MAX_HOUR } from '../lib/constants'

/** How many hours a task covers; at least one. */
const durationOf = task => Math.max(1, (task.endHour ?? task.hour + 1) - task.hour)

/** End hours are exclusive, at least start+1, and never past midnight. */
const clampEnd = (hour, endHour) =>
  Math.min(MAX_HOUR + 1, Math.max(hour + 1, endHour ?? hour + 1))

/**
 * Destructive actions stash the previous tasks/completed arrays so UNDO can put
 * them back wholesale. The state is small enough that a snapshot is both cheaper
 * and safer than maintaining inverse actions.
 */
const snapshot = state => ({ tasks: state.tasks, completed: state.completed })

const withUndo = (state, next, label) => ({
  ...next,
  undo: { ...snapshot(state), label, at: Date.now() }
})

export const reducer = (state, action) => {
  switch (action.type) {
    case 'add': {
      const hour = action.hour ?? null
      const task = {
        id: createId(),
        title: action.title,
        day: action.day ?? null,
        hour,
        endHour: hour === null ? null : clampEnd(hour, action.endHour),
        completed: false,
        createdAt: Date.now()
      }
      return { ...state, tasks: [...state.tasks, task] }
    }

    case 'edit': {
      return {
        ...state,
        tasks: state.tasks.map(task => {
          if (task.id !== action.id) return task
          const hour = 'hour' in action ? action.hour : task.hour
          const endHour = 'endHour' in action ? action.endHour : task.endHour
          return {
            ...task,
            title: action.title ?? task.title,
            day: 'day' in action ? action.day : task.day,
            hour,
            endHour: hour === null ? null : clampEnd(hour, endHour)
          }
        })
      }
    }

    // Moving keeps the length of the task; only its start changes.
    case 'move': {
      return {
        ...state,
        tasks: state.tasks.map(task => {
          if (task.id !== action.id) return task
          if (action.hour === null) return { ...task, day: action.day, hour: null, endHour: null }
          const length = durationOf(task)
          return {
            ...task,
            day: action.day,
            hour: action.hour,
            endHour: clampEnd(action.hour, action.hour + length)
          }
        })
      }
    }

    // Dragging the bottom edge of a task: the start stays put.
    case 'resize': {
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.id && task.hour !== null
            ? { ...task, endHour: clampEnd(task.hour, action.endHour) }
            : task
        )
      }
    }

    case 'complete': {
      const task = state.tasks.find(t => t.id === action.id)
      if (!task) return state
      return {
        ...state,
        tasks: state.tasks.filter(t => t.id !== action.id),
        completed: [
          {
            id: task.id,
            title: task.title,
            day: task.day,
            hour: task.hour,
            endHour: task.endHour,
            completedAt: Date.now()
          },
          ...state.completed
        ]
      }
    }

    // Bulk version of 'complete': everything on the grid and in the Inbox.
    case 'completeAll': {
      if (state.tasks.length === 0) return state
      const completedAt = Date.now()
      const moved = state.tasks.map(task => ({
        id: task.id,
        title: task.title,
        day: task.day,
        hour: task.hour,
        endHour: task.endHour,
        completedAt
      }))
      return withUndo(
        state,
        { ...state, tasks: [], completed: [...moved, ...state.completed] },
        'Completed all tasks'
      )
    }

    case 'restore': {
      const task = state.completed.find(t => t.id === action.id)
      if (!task) return state
      return {
        ...state,
        completed: state.completed.filter(t => t.id !== action.id),
        tasks: [
          ...state.tasks,
          {
            id: task.id,
            title: task.title,
            day: task.day,
            hour: task.hour,
            endHour: task.hour === null ? null : clampEnd(task.hour, task.endHour),
            completed: false,
            createdAt: Date.now()
          }
        ]
      }
    }

    case 'delete': {
      const inTasks = state.tasks.some(t => t.id === action.id)
      const next = inTasks
        ? { ...state, tasks: state.tasks.filter(t => t.id !== action.id) }
        : { ...state, completed: state.completed.filter(t => t.id !== action.id) }
      return withUndo(state, next, 'Task deleted')
    }

    case 'clearAll':
      if (state.tasks.length === 0) return state
      return withUndo(state, { ...state, tasks: [] }, 'Cleared all tasks')

    case 'clearCompleted':
      if (state.completed.length === 0) return state
      return withUndo(state, { ...state, completed: [] }, 'Cleared completed')

    case 'undo': {
      if (!state.undo) return state
      const { tasks, completed } = state.undo
      return { ...state, tasks, completed, undo: null }
    }

    case 'dismissUndo':
      return state.undo ? { ...state, undo: null } : state

    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.settings } }

    default:
      return state
  }
}

const init = () => ({ ...loadState(), undo: null })

export const useTasks = () => {
  const [state, dispatch] = useReducer(reducer, undefined, init)
  const [toast, setToast] = useState(null)
  const firstRender = useRef(true)

  // Persist everything except the transient undo buffer.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const { undo, ...persisted } = state
    saveState(persisted)
  }, [state])

  // Surface an undo offer whenever a destructive action stashes a snapshot.
  useEffect(() => {
    if (state.undo) setToast({ message: state.undo.label, undoable: true, at: state.undo.at })
  }, [state.undo])

  const announce = useCallback(message => {
    setToast({ message, undoable: false, at: Date.now() })
  }, [])

  const undo = useCallback(() => {
    dispatch({ type: 'undo' })
    setToast({ message: 'Restored', undoable: false, at: Date.now() })
  }, [])

  const dismissToast = useCallback(() => {
    setToast(null)
    dispatch({ type: 'dismissUndo' })
  }, [])

  /**
   * Per-day lane assignment, so tasks whose hours overlap sit side by side
   * instead of on top of each other. Each task takes the first lane that is free
   * at its start hour; the lane count is per day, which keeps widths stable as
   * you drag rather than reflowing the whole column.
   */
  const layout = useMemo(() => {
    const map = new Map()
    DAYS.forEach(day => {
      const dayTasks = state.tasks
        .filter(task => task.day === day && task.hour !== null)
        .sort((a, b) => a.hour - b.hour || durationOf(b) - durationOf(a))

      const laneEnds = []
      const items = dayTasks.map(task => {
        let lane = laneEnds.findIndex(end => end <= task.hour)
        if (lane === -1) lane = laneEnds.length
        laneEnds[lane] = task.endHour ?? task.hour + 1
        return { task, lane }
      })

      if (items.length > 0) map.set(day, { items, lanes: laneEnds.length })
    })
    return map
  }, [state.tasks])

  /** Anything without both a day and an hour lives in the Inbox. */
  const inbox = useMemo(
    () => state.tasks.filter(task => task.day === null || task.hour === null),
    [state.tasks]
  )

  return { state, dispatch, layout, inbox, toast, announce, undo, dismissToast }
}

/** Step a task one cell in a direction, clamped so it stays fully on the grid. */
export const nudge = (task, dx, dy, settings) => {
  const dayIndex = task.day === null ? 0 : DAYS.indexOf(task.day)
  const hour = task.hour === null ? settings.startHour : task.hour
  const length = durationOf({ ...task, hour })
  const lastStart = Math.max(settings.startHour, settings.endHour - length + 1)
  return {
    day: DAYS[Math.min(DAYS.length - 1, Math.max(0, dayIndex + dx))],
    hour: Math.min(lastStart, Math.max(settings.startHour, hour + dy))
  }
}

/**
 * Tasks that would not fit entirely inside an hour range — either starting before
 * it or running past its end. settings.endHour is the last visible row and task
 * endHour is exclusive, so a task ending at 22 occupies row 21.
 */
export const tasksOutsideRange = (tasks, startHour, endHour) =>
  tasks
    .filter(task => {
      // Unscheduled tasks live in the Inbox and are unaffected by the range.
      if (task.hour === null || task.day === null) return false
      const lastRow = (task.endHour ?? task.hour + 1) - 1
      return task.hour < startHour || lastRow > endHour
    })
    .sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.hour - b.hour)

export { durationOf }
