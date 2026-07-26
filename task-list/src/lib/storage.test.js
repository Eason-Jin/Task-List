import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BACKUP_KEY,
  LEGACY_COMPLETED_KEY,
  LEGACY_TASKS_KEY,
  SCHEMA_VERSION,
  STORAGE_KEY,
  loadState,
  migrateV1,
  saveState,
  saveStateNow,
  createId,
  defaultState
} from './storage'

const V1_TASKS = [
  {
    day: 'Monday',
    tasks: [
      { task: 'standup', time: '9:00', completed: false },
      { task: 'standup', time: '9:00', completed: true }
    ]
  },
  { day: 'Wednesday', tasks: [{ task: 'no time', time: '', completed: false }] },
  { day: 'Friday', tasks: [{ task: 'review', time: '15:00', completed: false }] }
]

const V1_COMPLETED = [{ task: 'old done', time: '10:00', completed: true }]

const seedV1 = () => {
  localStorage.setItem(LEGACY_TASKS_KEY, JSON.stringify(V1_TASKS))
  localStorage.setItem(LEGACY_COMPLETED_KEY, JSON.stringify(V1_COMPLETED))
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('migrateV1', () => {
  it('carries every task across with its day, hour and title intact', () => {
    const state = migrateV1(V1_TASKS, V1_COMPLETED)

    expect(state.version).toBe(SCHEMA_VERSION)
    expect(state.tasks).toHaveLength(4)
    expect(state.tasks.map(t => t.title)).toEqual(['standup', 'standup', 'no time', 'review'])

    const review = state.tasks.find(t => t.title === 'review')
    expect(review).toMatchObject({ day: 'Friday', hour: 15, endHour: 16, completed: false })
  })

  it('gives every v1 task a one-hour duration, matching how the old grid drew it', () => {
    const state = migrateV1(V1_TASKS, V1_COMPLETED)
    state.tasks
      .filter(t => t.hour !== null)
      .forEach(t => expect(t.endHour).toBe(t.hour + 1))
    state.completed.forEach(t => expect(t.endHour).toBe(t.hour + 1))
  })

  it('leaves endHour null on an unscheduled task', () => {
    const state = migrateV1(V1_TASKS, [])
    expect(state.tasks.find(t => t.title === 'no time').endHour).toBeNull()
  })

  it('gives same-named tasks distinct ids', () => {
    const state = migrateV1(V1_TASKS, [])
    const ids = state.tasks.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    ids.forEach(id => expect(typeof id).toBe('string'))
  })

  it('keeps a task that had no time, filing it as unscheduled', () => {
    const state = migrateV1(V1_TASKS, [])
    const orphan = state.tasks.find(t => t.title === 'no time')
    expect(orphan).toBeDefined()
    expect(orphan.hour).toBeNull()
    expect(orphan.day).toBe('Wednesday')
  })

  it('preserves the checked state of tasks still sitting in the grid', () => {
    const state = migrateV1(V1_TASKS, [])
    expect(state.tasks.filter(t => t.completed)).toHaveLength(1)
  })

  it('moves legacy completedTasks into completed with no day', () => {
    const state = migrateV1([], V1_COMPLETED)
    expect(state.completed).toHaveLength(1)
    expect(state.completed[0]).toMatchObject({ title: 'old done', day: null, hour: 10 })
  })

  it('widens the hour range so no migrated task falls off the grid', () => {
    const state = migrateV1(
      [{ day: 'Monday', tasks: [{ task: 'dawn patrol', time: '5:00', completed: false }] }],
      []
    )
    expect(state.settings.startHour).toBe(5)
    expect(state.settings.endHour).toBeGreaterThanOrEqual(21)
  })

  it('ignores unusable entries rather than creating blank tasks', () => {
    const state = migrateV1(
      [
        { day: 'Monday', tasks: [{ task: '   ', time: '9:00' }, null, { time: '9:00' }] },
        { day: 'Monday', tasks: [{ task: 'real', time: '9:00' }] }
      ],
      []
    )
    expect(state.tasks).toHaveLength(1)
    expect(state.tasks[0].title).toBe('real')
  })

  it('returns null when there is nothing to migrate', () => {
    expect(migrateV1([], [])).toBeNull()
    expect(migrateV1(null, null)).toBeNull()
  })
})

describe('loadState', () => {
  it('migrates v1 data and writes the v2 key', () => {
    seedV1()
    const state = loadState()

    expect(state.tasks).toHaveLength(4)
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(stored.version).toBe(SCHEMA_VERSION)
    expect(stored.tasks).toHaveLength(4)
  })

  it('backs the original data up before overwriting anything', () => {
    seedV1()
    loadState()

    const backup = JSON.parse(localStorage.getItem(BACKUP_KEY))
    expect(JSON.parse(backup.tasks)).toEqual(V1_TASKS)
    expect(JSON.parse(backup.completedTasks)).toEqual(V1_COMPLETED)
    expect(backup.migratedAt).toBeTruthy()
  })

  it('does not migrate twice — v2 data wins over leftover legacy keys', () => {
    seedV1()
    const first = loadState()
    // Simulate the user deleting everything after the migration.
    saveStateNow({ ...first, tasks: [], completed: [] })

    const second = loadState()
    expect(second.tasks).toHaveLength(0)
    expect(second.completed).toHaveLength(0)
  })

  it('falls back to an empty planner when the v2 key is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    const state = loadState()
    expect(state.tasks).toEqual([])
    expect(state.settings).toEqual(defaultState().settings)
  })

  it('falls back to an empty planner when the legacy keys are corrupt', () => {
    localStorage.setItem(LEGACY_TASKS_KEY, '[[[')
    localStorage.setItem(LEGACY_COMPLETED_KEY, 'nope')
    const state = loadState()
    expect(state.tasks).toEqual([])
  })

  it('returns defaults on a first run with empty storage', () => {
    const state = loadState()
    expect(state).toEqual(defaultState())
  })

  it('gives stored tasks that predate durations a one-hour block', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 2,
        settings: { startHour: 7, endHour: 21, theme: 'system' },
        tasks: [{ id: 'a', title: 'meeting', day: 'Monday', hour: 9, completed: false }],
        completed: [{ id: 'b', title: 'done', day: null, hour: 10 }]
      })
    )
    const state = loadState()
    expect(state.tasks[0]).toMatchObject({ hour: 9, endHour: 10 })
    expect(state.completed[0]).toMatchObject({ hour: 10, endHour: 11 })
    expect(state.version).toBe(3)
  })

  it('keeps a multi-hour block intact across a reload', () => {
    saveStateNow({
      ...defaultState(),
      tasks: [
        { id: 'a', title: 'workshop', day: 'Tuesday', hour: 9, endHour: 13, completed: false }
      ]
    })
    expect(loadState().tasks[0]).toMatchObject({ hour: 9, endHour: 13 })
  })

  it('repairs an end time that is not after the start', () => {
    saveStateNow({
      ...defaultState(),
      tasks: [
        { id: 'a', title: 'backwards', day: 'Monday', hour: 14, endHour: 11, completed: false },
        { id: 'b', title: 'same', day: 'Monday', hour: 14, endHour: 14, completed: false }
      ]
    })
    const state = loadState()
    expect(state.tasks[0].endHour).toBe(15)
    expect(state.tasks[1].endHour).toBe(15)
  })

  it('allows a task in the last slot to end at midnight', () => {
    saveStateNow({
      ...defaultState(),
      settings: { startHour: 7, endHour: 23, theme: 'system' },
      tasks: [{ id: 'a', title: 'late', day: 'Monday', hour: 23, endHour: 24, completed: false }]
    })
    expect(loadState().tasks[0].endHour).toBe(24)
  })

  it('respects a saved hour range even when a task falls outside it', () => {
    // The range is a user setting: narrowing it past a task is warned about in
    // the UI, not silently undone on the next load.
    saveStateNow({
      ...defaultState(),
      settings: { startHour: 9, endHour: 12, theme: 'system' },
      tasks: [{ id: 'a', title: 'marathon', day: 'Monday', hour: 10, endHour: 19, completed: false }]
    })
    const state = loadState()
    expect(state.settings.startHour).toBe(9)
    expect(state.settings.endHour).toBe(12)
    // The task itself is untouched — it is only hidden.
    expect(state.tasks[0]).toMatchObject({ hour: 10, endHour: 19 })
  })

  it('repairs a partially malformed v2 payload instead of throwing', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 2,
        settings: { startHour: 'x', endHour: null, theme: 'neon' },
        tasks: [{ title: 'kept' }, { title: '' }, 'junk'],
        completed: 'not an array'
      })
    )
    const state = loadState()
    expect(state.tasks).toHaveLength(1)
    expect(state.tasks[0]).toMatchObject({ title: 'kept', day: null, hour: null })
    expect(state.completed).toEqual([])
    expect(state.settings.theme).toBe('system')
    expect(state.settings.startHour).toBe(defaultState().settings.startHour)
  })
})

describe('storage that misbehaves', () => {
  it('falls back to defaults when reading throws, as in some privacy modes', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('access denied')
    })
    expect(loadState()).toEqual(defaultState())
  })

  it('reports a failed write rather than throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    expect(saveStateNow(defaultState())).toBe(false)
  })

  it('still shows migrated tasks when the backup cannot be written', () => {
    seedV1()
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    setItem.mockImplementationOnce(() => {
      throw new Error('quota exceeded') // the backup
    })

    // The migration result is returned even though the backup failed.
    expect(loadState().tasks).toHaveLength(4)
  })

  it('reports a successful write', () => {
    expect(saveStateNow(defaultState())).toBe(true)
  })
})

describe('saveState', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('waits before writing, so a burst of edits touches storage once', () => {
    saveState({ ...defaultState(), tasks: [] })
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()

    vi.advanceTimersByTime(150)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).version).toBe(SCHEMA_VERSION)
  })

  it('collapses rapid calls into the last one', () => {
    const first = { ...defaultState(), tasks: [{ id: 'a', title: 'first', day: null, hour: null, endHour: null, completed: false, createdAt: 1 }] }
    const second = { ...defaultState(), tasks: [{ id: 'b', title: 'second', day: null, hour: null, endHour: null, completed: false, createdAt: 1 }] }

    saveState(first)
    vi.advanceTimersByTime(100)
    saveState(second)
    vi.advanceTimersByTime(150)

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(stored.tasks).toHaveLength(1)
    expect(stored.tasks[0].title).toBe('second')
  })

  it('accepts a custom delay', () => {
    saveState(defaultState(), 500)
    vi.advanceTimersByTime(499)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    vi.advanceTimersByTime(1)
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
  })
})

describe('settings repair', () => {
  it('pulls an end hour that precedes the start up to meet it', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 3,
        settings: { startHour: 14, endHour: 9, theme: 'light' },
        tasks: [],
        completed: []
      })
    )
    const state = loadState()
    expect(state.settings.startHour).toBe(14)
    expect(state.settings.endHour).toBe(14)
  })

  it('clamps hours outside the day', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 3,
        settings: { startHour: -5, endHour: 99, theme: 'dark' },
        tasks: [],
        completed: []
      })
    )
    const state = loadState()
    expect(state.settings.startHour).toBe(0)
    expect(state.settings.endHour).toBe(23)
    expect(state.settings.theme).toBe('dark')
  })

  it('drops a task whose hour is not a real time of day', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 3,
        settings: { startHour: 7, endHour: 21, theme: 'system' },
        tasks: [{ id: 'a', title: 'odd', day: 'Monday', hour: 99 }],
        completed: []
      })
    )
    // The hour is unusable, so it becomes unscheduled rather than being lost.
    expect(loadState().tasks[0]).toMatchObject({ title: 'odd', hour: null, endHour: null })
  })

  it('ignores a stored value that is not an object at all', () => {
    localStorage.setItem(STORAGE_KEY, '"just a string"')
    expect(loadState()).toEqual(defaultState())
    localStorage.setItem(STORAGE_KEY, 'null')
    expect(loadState()).toEqual(defaultState())
  })

  it('keeps a legacy time string on a v2 task', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 2,
        settings: { startHour: 7, endHour: 21, theme: 'system' },
        tasks: [{ id: 'a', title: 'stringly', day: 'Monday', hour: '9:00' }],
        completed: []
      })
    )
    expect(loadState().tasks[0]).toMatchObject({ hour: 9, endHour: 10 })
  })

  it('invents ids and timestamps when they are missing', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 3,
        settings: { startHour: 7, endHour: 21, theme: 'system' },
        tasks: [{ title: 'no id', day: 'Monday', hour: 9, createdAt: 'nope' }],
        completed: [{ title: 'also none', day: null, hour: 9, completedAt: 'nope' }]
      })
    )
    const state = loadState()
    expect(typeof state.tasks[0].id).toBe('string')
    expect(Number.isFinite(state.tasks[0].createdAt)).toBe(true)
    expect(typeof state.completed[0].id).toBe('string')
    expect(Number.isFinite(state.completed[0].completedAt)).toBe(true)
  })
})

describe('createId', () => {
  it('falls back to a random string when crypto.randomUUID is unavailable', () => {
    const original = globalThis.crypto
    // eslint-disable-next-line no-global-assign
    Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true })

    const id = createId()
    expect(typeof id).toBe('string')
    expect(id.startsWith('t_')).toBe(true)
    expect(createId()).not.toBe(id)

    Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true })
  })

  it('uses crypto.randomUUID when it is there', () => {
    expect(createId()).not.toBe(createId())
  })
})
