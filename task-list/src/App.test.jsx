import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import App from './App'
import {
  LEGACY_COMPLETED_KEY,
  LEGACY_TASKS_KEY,
  SCHEMA_VERSION,
  STORAGE_KEY,
  defaultState,
  saveStateNow
} from './lib/storage'
import { DRAG_TYPE, SPAN_TYPE } from './components/TaskChip/TaskChip'
import {
  change,
  cleanup,
  click,
  dragEvent,
  keyDown,
  mount,
  pointerDown,
  toggle,
  type,
  windowPointerUp
} from './test/dom'

const seed = tasks =>
  saveStateNow({
    ...defaultState(),
    tasks: tasks.map((t, i) => ({
      id: `t${i}`,
      completed: false,
      createdAt: 0,
      endHour: t.hour === null ? null : t.hour + 1,
      ...t
    }))
  })

const render = () => mount(<App />)

const composer = el => {
  const [day, start, end] = el.$$('.composer select')
  return { title: el.$('.composer__title'), day, start, end }
}

const cell = (el, day, hour) => el.$(`[aria-label="${day} ${String(hour).padStart(2, '0')}:00"]`)

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY))

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('first run and migration', () => {
  it('renders an empty planner', () => {
    const el = render()
    expect(el.text()).toContain('Task List')
    expect(el.text()).toContain('Nothing scheduled')
    expect(el.$$('.grid__task')).toHaveLength(0)
  })

  it('renders v1 data through the migration, unscheduled task included', () => {
    localStorage.setItem(
      LEGACY_TASKS_KEY,
      JSON.stringify([
        { day: 'Monday', tasks: [{ task: 'standup', time: '9:00', completed: false }] },
        { day: 'Wednesday', tasks: [{ task: 'no time', time: '', completed: false }] }
      ])
    )
    localStorage.setItem(
      LEGACY_COMPLETED_KEY,
      JSON.stringify([{ task: 'old done', time: '10:00', completed: true }])
    )

    const el = render()

    expect(el.text()).toContain('standup')
    expect(el.$('.inbox').textContent).toContain('no time')
    expect(el.$('.done').textContent).toContain('old done')
    expect(el.text()).toContain('2 tasks planned')
    expect(stored().version).toBe(SCHEMA_VERSION)
  })

  it('renders every day column, weekend included', () => {
    const el = render()
    expect(el.text()).toContain('Saturday')
    expect(el.text()).toContain('Sunday')
  })

  it('counts a single task in the singular', () => {
    seed([{ title: 'one', day: 'Monday', hour: 9 }])
    expect(render().text()).toContain('1 task planned')
  })

  it('mentions completed tasks in the subtitle', () => {
    saveStateNow({
      ...defaultState(),
      completed: [{ id: 'c', title: 'done', day: null, hour: 9, endHour: 10, completedAt: 1 }]
    })
    expect(render().text()).toContain('1 done')
  })
})

describe('layout', () => {
  it('spans a multi-hour task across the rows it covers', () => {
    saveStateNow({
      ...defaultState(),
      tasks: [
        { id: 'a', title: 'workshop', day: 'Tuesday', hour: 9, endHour: 13, completed: false }
      ]
    })

    const el = render()
    const block = el.$('.grid__task')

    // Tuesday -> column 3; 09:00 on a grid from 07:00 -> row 4; four hours.
    expect(block.style.gridRow).toBe('4 / span 4')
    expect(block.style.gridColumn).toBe('3')
    expect(el.text()).toContain('09:00 – 13:00')
  })

  it('draws a task written before durations existed as a single row', () => {
    saveStateNow({
      ...defaultState(),
      tasks: [{ id: 'a', title: 'standup', day: 'Monday', hour: 9, completed: false }]
    })
    expect(render().$('.grid__task').style.gridRow).toBe('4 / span 1')
  })

  it('keeps every day at the base width when nothing overlaps', () => {
    seed([
      { title: 'standup', day: 'Tuesday', hour: 9 },
      { title: 'review', day: 'Tuesday', hour: 11 }
    ])
    const template = render().$('.grid').style.gridTemplateColumns
    expect(template).toContain('minmax(132px, 1fr)')
    expect(template).not.toContain('minmax(248px')
  })

  it('widens only the day whose tasks overlap', () => {
    seed([
      { title: 'standup', day: 'Tuesday', hour: 9 },
      { title: 'review', day: 'Tuesday', hour: 9 },
      { title: 'call', day: 'Tuesday', hour: 9 },
      { title: 'solo', day: 'Friday', hour: 9 }
    ])
    const el = render()

    expect(el.$('.grid').style.gridTemplateColumns).toBe(
      'var(--time-col) minmax(132px, 1fr) minmax(372px, 1fr) minmax(132px, 1fr) ' +
        'minmax(132px, 1fr) minmax(132px, 1fr) minmax(132px, 1fr) minmax(132px, 1fr)'
    )
    // Nothing is hidden.
    expect(el.$$('.grid__task')).toHaveLength(4)
  })
})

describe('mobile tabs', () => {
  const tabs = el => {
    const [schedule, tasks, settings] = el.$$('.tabbar__btn')
    return { schedule, tasks, settings }
  }

  it('starts on the schedule tab', () => {
    const el = render()
    const { schedule, tasks } = tabs(el)
    expect(el.$('.app__main').className).toContain('app__main--schedule')
    expect(schedule.getAttribute('aria-current')).toBe('page')
    expect(tasks.getAttribute('aria-current')).toBeNull()
  })

  it('switches to the merged tasks tab when clicked', () => {
    const el = render()
    const { schedule, tasks } = tabs(el)

    click(tasks)
    expect(el.$('.app__main').className).toContain('app__main--tasks')
    expect(tasks.getAttribute('aria-current')).toBe('page')

    click(schedule)
    expect(el.$('.app__main').className).toContain('app__main--schedule')
  })

  it('opens the settings dialog from its tab instead of switching panels', () => {
    const el = render()
    const { settings } = tabs(el)

    expect(el.$('.settings').open).toBe(false)
    click(settings)
    expect(el.$('.settings').open).toBe(true)
    expect(el.$('.app__main').className).toContain('app__main--schedule')
    expect(settings.getAttribute('aria-current')).toBe('page')
  })

  it('shows a combined count once there is something unscheduled or completed', () => {
    seed([{ title: 'unscheduled', day: null, hour: null }])
    const el = render()
    expect(tabs(el).tasks.textContent).toContain('Tasks (1)')

    toggle(el.$('.chip__check'))
    expect(tabs(el).tasks.textContent).toContain('Tasks (1)')
  })
})

describe('adding tasks', () => {
  it('adds from the composer and persists it', () => {
    vi.useFakeTimers()
    const el = render()

    type(composer(el).title, 'water plants')
    change(composer(el).day, 'Thursday')
    change(composer(el).start, '10')
    click(el.button('Add task'))

    expect(el.text()).toContain('water plants')
    expect(el.text()).toContain('Added to Thu 10:00')

    vi.advanceTimersByTime(200)
    expect(stored().tasks[0]).toMatchObject({ title: 'water plants', day: 'Thursday', hour: 10 })
  })

  it('files a task with no day or time under Unscheduled', () => {
    const el = render()

    type(composer(el).title, 'someday')
    click(el.button('Add task'))

    expect(el.$('.inbox').textContent).toContain('someday')
    expect(el.text()).toContain('Added to Unscheduled')
  })

  it('pre-fills the composer from a swept range on the grid', () => {
    const el = render()

    pointerDown(cell(el, 'Monday', 9))
    windowPointerUp()

    expect(composer(el).day.value).toBe('Monday')
    expect(composer(el).start.value).toBe('9')
    expect(composer(el).end.value).toBe('10')
  })
})

describe('completing and restoring', () => {
  it('ticks a task off into the completed list, and back again', () => {
    seed([{ title: 'standup', day: 'Monday', hour: 9 }])
    const el = render()

    toggle(el.$('.chip__check'))
    expect(el.$('.done').textContent).toContain('standup')
    expect(el.$$('.grid__task')).toHaveLength(0)
    expect(el.text()).toContain('Completed')

    toggle(el.$('.done input[type="checkbox"]'))
    expect(el.$$('.grid__task')).toHaveLength(1)
    expect(el.text()).toContain('Moved back to the schedule')
  })

  it('completes everything at once, after confirming', () => {
    seed([
      { title: 'one', day: 'Monday', hour: 9 },
      { title: 'two', day: null, hour: null }
    ])
    const el = render()

    click(el.button('Complete all'))
    expect(el.text()).toContain('Complete all tasks?')
    expect(el.text()).toContain('2 tasks will move to the completed list')

    click(el.$('.confirm .btn--primary'))
    expect(el.$$('.done__item')).toHaveLength(2)
    expect(el.$$('.grid__task')).toHaveLength(0)
  })
})

describe('confirmations', () => {
  it('asks before deleting a task, and names it', () => {
    seed([{ title: 'standup', day: 'Monday', hour: 9 }])
    const el = render()

    click(el.$('.chip__delete'))
    expect(el.text()).toContain('Delete task?')
    expect(el.text()).toContain('standup')
    expect(el.text()).toContain('Mon 09:00')

    click(el.button('Delete', '.confirm'))
    expect(el.$$('.grid__task')).toHaveLength(0)
  })

  it('keeps the task when the confirmation is cancelled', () => {
    seed([{ title: 'standup', day: 'Monday', hour: 9 }])
    const el = render()

    click(el.$('.chip__delete'))
    click(el.button('Cancel', '.confirm'))

    expect(el.$$('.grid__task')).toHaveLength(1)
  })

  it('describes an unscheduled task without a slot', () => {
    seed([{ title: 'loose end', day: null, hour: null }])
    const el = render()

    click(el.$('.chip__delete'))
    expect(el.text()).toContain('“loose end” will be removed.')
  })

  it('asks before clearing all tasks', () => {
    seed([{ title: 'one', day: 'Monday', hour: 9 }])
    const el = render()

    click(el.button('Clear all'))
    expect(el.text()).toContain('1 task will be removed from the schedule')

    click(el.button('Clear all', '.confirm'))
    expect(el.$$('.grid__task')).toHaveLength(0)
  })

  it('asks before clearing the completed list', () => {
    saveStateNow({
      ...defaultState(),
      completed: [{ id: 'c', title: 'done', day: null, hour: 9, endHour: 10, completedAt: 1 }]
    })
    const el = render()

    click(el.button('Clear'))
    expect(el.text()).toContain('1 completed task will be removed for good')

    click(el.button('Clear', '.confirm'))
    expect(el.$$('.done__item')).toHaveLength(0)
  })

  it('deletes a completed task on its own', () => {
    saveStateNow({
      ...defaultState(),
      completed: [{ id: 'c', title: 'done', day: null, hour: 9, endHour: 10, completedAt: 1 }]
    })
    const el = render()

    click(el.$('.done__delete'))
    click(el.button('Delete', '.confirm'))

    expect(el.$$('.done__item')).toHaveLength(0)
  })
})

describe('undo', () => {
  it('offers Undo after a delete and puts the task back', () => {
    seed([{ title: 'standup', day: 'Monday', hour: 9 }])
    const el = render()

    click(el.$('.chip__delete'))
    click(el.button('Delete', '.confirm'))
    expect(el.text()).toContain('Task deleted')

    click(el.button('Undo'))
    expect(el.$$('.grid__task')).toHaveLength(1)
    expect(el.text()).toContain('Restored')
  })

  it('restores everything after Clear all', () => {
    seed([
      { title: 'one', day: 'Monday', hour: 9 },
      { title: 'two', day: 'Tuesday', hour: 10 }
    ])
    const el = render()

    click(el.button('Clear all'))
    click(el.button('Clear all', '.confirm'))
    click(el.button('Undo'))

    expect(el.$$('.grid__task')).toHaveLength(2)
  })

  it('dismisses the toast, giving up the undo', () => {
    seed([{ title: 'standup', day: 'Monday', hour: 9 }])
    const el = render()

    click(el.$('.chip__delete'))
    click(el.button('Delete', '.confirm'))
    click(el.$('.toast__close'))

    expect(el.$('.toast')).toBeNull()
  })
})

describe('moving tasks', () => {
  it('moves a task by drag and drop, keeping its length', () => {
    seed([{ title: 'workshop', day: 'Tuesday', hour: 9, endHour: 12 }])
    const el = render()

    dragEvent(cell(el, 'Friday', 14), 'drop', {
      types: [DRAG_TYPE, `${SPAN_TYPE}3`],
      data: { [DRAG_TYPE]: 't0' }
    })

    const block = el.$('.grid__task')
    expect(block.style.gridColumn).toBe('6') // Friday
    expect(block.style.gridRow).toBe('9 / span 3') // 14:00, still three hours
  })

  it('moves a task with Ctrl and the arrow keys', () => {
    seed([{ title: 'standup', day: 'Monday', hour: 9 }])
    const el = render()

    keyDown(el.$('.chip'), 'ArrowRight', { ctrlKey: true })

    expect(el.text()).toContain('Moved to Tue 09:00')
    expect(el.$('.grid__task').style.gridColumn).toBe('3')
  })

  it('resizes a task by dragging its bottom edge', () => {
    seed([{ title: 'standup', day: 'Monday', hour: 9 }])
    const el = render()

    pointerDown(el.$('.chip__resize'))
    // pointerover on the cell two rows down, with the blocks now inert.
    el.$$('[role="gridcell"]')
      .find(node => node.getAttribute('aria-label') === 'Monday 11:00')
      .dispatchEvent(new MouseEvent('pointerover', { bubbles: true, relatedTarget: null }))
    windowPointerUp()

    expect(el.$('.grid__task').style.gridRow).toBe('4 / span 3')
  })

  it('unschedules a task dropped on the Inbox', () => {
    seed([{ title: 'standup', day: 'Monday', hour: 9 }])
    const el = render()

    dragEvent(el.$('.inbox'), 'drop', {
      types: [DRAG_TYPE, `${SPAN_TYPE}1`],
      data: { [DRAG_TYPE]: 't0' }
    })

    expect(el.$$('.grid__task')).toHaveLength(0)
    expect(el.$('.inbox').textContent).toContain('standup')
  })
})

describe('editing', () => {
  it('edits a task through the dialog', () => {
    seed([{ title: 'standup', day: 'Monday', hour: 9 }])
    const el = render()

    click(el.$('.chip__title'))
    const title = el.$('.editor input[type="text"]')
    expect(title.value).toBe('standup')

    type(title, 'standup v2')
    click(el.button('Save', '.editor'))

    expect(el.text()).toContain('standup v2')
    expect(el.text()).toContain('Task updated')
  })

  it('closes the editor without saving', () => {
    seed([{ title: 'standup', day: 'Monday', hour: 9 }])
    const el = render()

    click(el.$('.chip__title'))
    type(el.$('.editor input[type="text"]'), 'nope')
    click(el.$('.editor .btn:not(.btn--primary)'))

    expect(el.text()).toContain('standup')
    expect(el.text()).not.toContain('nope')
  })
})

describe('settings', () => {
  it('opens and closes the dialog', () => {
    const el = render()
    expect(el.$('.settings').open).toBe(false)

    click(el.$('.app__settings'))
    expect(el.$('.settings').open).toBe(true)

    click(el.button('Cancel', '.settings'))
    expect(el.$('.settings').open).toBe(false)
  })

  it('applies a saved theme to the document', () => {
    const el = render()
    click(el.$('.app__settings'))

    click(el.$('.settings [role="radio"][aria-checked="false"]'))
    click(el.button('Save', '.settings'))

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(el.text()).toContain('Settings saved')
  })

  it('drops the attribute again for the system theme', () => {
    saveStateNow({ ...defaultState(), settings: { startHour: 7, endHour: 21, theme: 'dark' } })
    const el = render()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

    click(el.$('.app__settings'))
    click(el.$('.settings [role="radiogroup"] button:last-child'))
    click(el.button('Save', '.settings'))

    expect(document.documentElement.getAttribute('data-theme')).toBeNull()
  })

  it('saves a narrowed range and redraws the grid', () => {
    const el = render()
    click(el.$('.app__settings'))

    change(el.$$('.settings select')[0], '9')
    change(el.$$('.settings select')[1], '11')
    click(el.button('Save', '.settings'))

    expect(el.$$('[role="rowheader"]')).toHaveLength(3)
  })

  it('names the task, day and range of anything outside the chosen hours', () => {
    seed([{ title: 'Early gym', day: 'Wednesday', hour: 6, endHour: 8 }])
    const el = render()
    click(el.$('.app__settings'))

    change(el.$$('.settings select')[0], '9')

    const warning = el.$('.settings__warn')
    expect(warning.textContent).toContain('This task is outside the range:')
    expect(warning.textContent).toContain('Early gym')
    expect(warning.textContent).toContain('Wednesday')
    expect(warning.textContent).toContain('06:00 – 08:00')
    expect(el.button('Save', '.settings').disabled).toBe(true)
  })

  it('shows no warning when the range covers everything', () => {
    seed([{ title: 'standup', day: 'Monday', hour: 9 }])
    const el = render()
    click(el.$('.app__settings'))

    expect(el.$('.settings__warn')).toBeNull()
  })
})

describe('composer bulk buttons', () => {
  it('puts Complete all between Add task and Clear all, disabled when empty', () => {
    const el = render()
    const labels = el.$$('.composer button').map(b => b.textContent.trim())

    expect(labels).toEqual(['Add task', 'Complete all', 'Clear all'])
    expect(el.button('Complete all').disabled).toBe(true)
    expect(el.button('Clear all').disabled).toBe(true)
  })
})
