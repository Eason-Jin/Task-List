import {
  DAYS,
  DEFAULT_START_HOUR,
  DEFAULT_END_HOUR,
  MIN_HOUR,
  MAX_HOUR
} from './constants'

// The key name is historical. Schema 3 only *added* endHour, and every reader
// below fills it in, so existing installs upgrade in place rather than through
// another migration + backup cycle.
export const STORAGE_KEY = 'tasklist.v2'
export const BACKUP_KEY = 'tasklist.v1.backup'
export const LEGACY_TASKS_KEY = 'tasks'
export const LEGACY_COMPLETED_KEY = 'completedTasks'

export const SCHEMA_VERSION = 3

export const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export const defaultState = () => ({
  version: SCHEMA_VERSION,
  settings: {
    startHour: DEFAULT_START_HOUR,
    endHour: DEFAULT_END_HOUR,
    theme: 'system'
  },
  tasks: [],
  completed: []
})

const readRaw = key => {
  try {
    return localStorage.getItem(key)
  } catch {
    // Storage can throw outright in some privacy modes.
    return null
  }
}

const parse = raw => {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Legacy times were strings like "9:00". Anything we cannot read — including the
 * empty string the old app happily saved when no time was picked — becomes null,
 * which lands the task in the Inbox instead of vanishing from the grid.
 */
const rawHour = value => {
  if (typeof value === 'number') return Number.isInteger(value) ? value : null
  if (typeof value !== 'string') return null
  const match = value.match(/^\s*(\d{1,2})\s*:/)
  return match ? Number(match[1]) : null
}

const parseHour = value => {
  const hour = rawHour(value)
  if (hour === null) return null
  return hour >= MIN_HOUR && hour <= MAX_HOUR ? hour : null
}

/**
 * End hours are exclusive and always at least one hour after the start, so a
 * task in the last slot of the day may legitimately end at 24. Tasks written
 * before durations existed have no endHour and become one-hour blocks — exactly
 * how the old grid rendered them.
 */
const parseEndHour = (value, hour) => {
  if (hour === null) return null
  const parsed = rawHour(value)
  if (parsed === null || parsed <= hour) return hour + 1
  return Math.min(parsed, MAX_HOUR + 1)
}

const normaliseDay = day => (DAYS.includes(day) ? day : null)

const normaliseTitle = value => {
  if (typeof value !== 'string') return null
  const title = value.trim()
  return title === '' ? null : title
}

/**
 * Widen the visible hour range so no task is hidden off-grid. settings.endHour
 * is the last *row*, and task endHour is exclusive, so a task ending at 22
 * occupies row 21.
 */
const rangeCovering = (records, settings) => {
  const scheduled = records.filter(r => r.hour !== null)
  if (scheduled.length === 0) return settings
  const starts = scheduled.map(r => r.hour)
  const lastRows = scheduled.map(r => (r.endHour ?? r.hour + 1) - 1)
  return {
    ...settings,
    startHour: Math.min(settings.startHour, ...starts),
    endHour: Math.min(MAX_HOUR, Math.max(settings.endHour, ...lastRows))
  }
}

/**
 * Convert the v1 shape into v2.
 *   tasks:          [{ day, tasks: [{ task, time, completed }] }]
 *   completedTasks: [{ task, time, completed }]
 * Returns null when there is nothing recognisable to migrate.
 */
export const migrateV1 = (legacyTasks, legacyCompleted) => {
  const state = defaultState()
  const now = Date.now()
  let found = false

  if (Array.isArray(legacyTasks)) {
    legacyTasks.forEach(entry => {
      if (!entry || !Array.isArray(entry.tasks)) return
      const day = normaliseDay(entry.day)
      entry.tasks.forEach(task => {
        if (!task) return
        const title = normaliseTitle(task.task)
        if (!title) return
        found = true
        const hour = parseHour(task.time)
        state.tasks.push({
          id: createId(),
          title,
          day,
          hour,
          // v1 had no notion of duration: every task was a single slot.
          endHour: hour === null ? null : hour + 1,
          // The old app left checked tasks in the grid until they were deleted,
          // so keep them there rather than silently completing them.
          completed: task.completed === true,
          createdAt: now
        })
      })
    })
  }

  if (Array.isArray(legacyCompleted)) {
    legacyCompleted.forEach(task => {
      if (!task) return
      const title = normaliseTitle(task.task)
      if (!title) return
      found = true
      const hour = parseHour(task.time)
      state.completed.push({
        id: createId(),
        title,
        // v1 never recorded which day a completed task came from.
        day: null,
        hour,
        endHour: hour === null ? null : hour + 1,
        completedAt: now
      })
    })
  }

  if (!found) return null

  state.settings = rangeCovering([...state.tasks, ...state.completed], state.settings)
  return state
}

/** Coerce anything read from storage into a state object we can safely render. */
const sanitise = value => {
  if (!value || typeof value !== 'object') return null
  const base = defaultState()
  const settings = value.settings && typeof value.settings === 'object' ? value.settings : {}

  const startHour = Number.isInteger(settings.startHour) ? settings.startHour : base.settings.startHour
  const endHour = Number.isInteger(settings.endHour) ? settings.endHour : base.settings.endHour

  const tasks = (Array.isArray(value.tasks) ? value.tasks : [])
    .map(task => {
      const title = normaliseTitle(task && task.title)
      if (!title) return null
      const hour = parseHour(task.hour)
      return {
        id: typeof task.id === 'string' ? task.id : createId(),
        title,
        day: normaliseDay(task.day),
        hour,
        endHour: parseEndHour(task.endHour, hour),
        completed: task.completed === true,
        createdAt: Number.isFinite(task.createdAt) ? task.createdAt : Date.now()
      }
    })
    .filter(Boolean)

  const completed = (Array.isArray(value.completed) ? value.completed : [])
    .map(task => {
      const title = normaliseTitle(task && task.title)
      if (!title) return null
      const hour = parseHour(task.hour)
      return {
        id: typeof task.id === 'string' ? task.id : createId(),
        title,
        day: normaliseDay(task.day),
        hour,
        endHour: parseEndHour(task.endHour, hour),
        completedAt: Number.isFinite(task.completedAt) ? task.completedAt : Date.now()
      }
    })
    .filter(Boolean)

  const settingsOut = {
    startHour: Math.max(MIN_HOUR, Math.min(startHour, MAX_HOUR)),
    endHour: Math.max(MIN_HOUR, Math.min(endHour, MAX_HOUR)),
    theme: ['light', 'dark', 'system'].includes(settings.theme) ? settings.theme : 'system'
  }
  if (settingsOut.endHour < settingsOut.startHour) {
    settingsOut.endHour = settingsOut.startHour
  }

  return {
    version: SCHEMA_VERSION,
    settings: rangeCovering([...tasks, ...completed], settingsOut),
    tasks,
    completed
  }
}

/**
 * Read app state, migrating v1 data on first run. Never throws: a corrupt or
 * unreadable store degrades to an empty planner rather than a blank screen.
 */
export const loadState = () => {
  const current = sanitise(parse(readRaw(STORAGE_KEY)))
  if (current) return current

  const legacyTasksRaw = readRaw(LEGACY_TASKS_KEY)
  const legacyCompletedRaw = readRaw(LEGACY_COMPLETED_KEY)
  if (!legacyTasksRaw && !legacyCompletedRaw) return defaultState()

  const migrated = migrateV1(parse(legacyTasksRaw), parse(legacyCompletedRaw))
  if (!migrated) return defaultState()

  // Back the originals up before anything else can overwrite them.
  try {
    localStorage.setItem(
      BACKUP_KEY,
      JSON.stringify({
        migratedAt: new Date().toISOString(),
        tasks: legacyTasksRaw,
        completedTasks: legacyCompletedRaw
      })
    )
  } catch {
    // A failed backup should not block the user from seeing their tasks.
  }

  saveStateNow(migrated)
  return migrated
}

export const saveStateNow = state => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    // Quota exceeded or storage disabled — the session still works in memory.
    return false
  }
}

let saveTimer = null

/** Debounced write so rapid edits (typing, dragging) touch storage once. */
export const saveState = (state, delay = 150) => {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    saveStateNow(state)
  }, delay)
}
