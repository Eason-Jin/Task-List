import { beforeEach, describe, expect, it } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import App from './App'
import {
  LEGACY_COMPLETED_KEY,
  LEGACY_TASKS_KEY,
  SCHEMA_VERSION,
  STORAGE_KEY,
  defaultState,
  saveStateNow
} from './lib/storage'

beforeEach(() => {
  localStorage.clear()
})

describe('App', () => {
  it('renders an empty planner without throwing', () => {
    const html = renderToString(<App />)
    expect(html).toContain('Task List')
    expect(html).toContain('Nothing scheduled')
  })

  it('renders v1 data through the migration, including the unscheduled task', () => {
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

    const html = renderToString(<App />)

    expect(html).toContain('standup')
    expect(html).toContain('no time')
    expect(html).toContain('old done')
    expect(html).toContain('2 tasks planned')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).version).toBe(SCHEMA_VERSION)
  })

  it('renders every day column, weekend included', () => {
    const html = renderToString(<App />)
    expect(html).toContain('Saturday')
    expect(html).toContain('Sunday')
  })

  it('spans a multi-hour task across the rows it covers', () => {
    saveStateNow({
      ...defaultState(),
      tasks: [
        { id: 'a', title: 'workshop', day: 'Tuesday', hour: 9, endHour: 13, completed: false }
      ]
    })

    const html = renderToString(<App />)

    // Tuesday is the 2nd day column (grid column 3); 09:00 on a grid starting at
    // 07:00 is row 4; 09:00-13:00 covers four rows.
    expect(html).toContain('grid-row:4 / span 4')
    expect(html).toContain('grid-column:3')
    expect(html).toContain('09:00 – 13:00')
  })

  it('keeps every day column at the base width when nothing overlaps', () => {
    saveStateNow({
      ...defaultState(),
      tasks: [
        { id: 'a', title: 'standup', day: 'Tuesday', hour: 9, endHour: 10, completed: false },
        { id: 'b', title: 'review', day: 'Tuesday', hour: 11, endHour: 12, completed: false }
      ]
    })

    const html = renderToString(<App />)
    // Two tasks on the same day that do not overlap share lane 0.
    expect(html).toContain('grid-template-columns:var(--time-col) minmax(132px, 1fr)')
    expect(html).not.toContain('minmax(248px')
  })

  it('widens only the day whose tasks overlap, so each lane stays readable', () => {
    saveStateNow({
      ...defaultState(),
      tasks: [
        { id: 'a', title: 'standup', day: 'Tuesday', hour: 9, endHour: 10, completed: false },
        { id: 'b', title: 'review', day: 'Tuesday', hour: 9, endHour: 10, completed: false },
        { id: 'c', title: 'call', day: 'Tuesday', hour: 9, endHour: 10, completed: false },
        { id: 'd', title: 'solo', day: 'Friday', hour: 9, endHour: 10, completed: false }
      ]
    })

    const html = renderToString(<App />)

    // Tuesday needs 3 lanes at 124px; Monday and Friday stay at the 132px base.
    expect(html).toContain(
      'grid-template-columns:var(--time-col) minmax(132px, 1fr) minmax(372px, 1fr) ' +
        'minmax(132px, 1fr) minmax(132px, 1fr) minmax(132px, 1fr) minmax(132px, 1fr) ' +
        'minmax(132px, 1fr)'
    )
    // All three tasks are drawn; none is hidden.
    expect(html).toContain('standup')
    expect(html).toContain('review')
    expect(html).toContain('call')
    expect(html).toContain('--lanes:3')
  })

  it('puts Complete all between Add task and Clear all, disabled when empty', () => {
    const html = renderToString(<App />)

    const add = html.indexOf('Add task')
    const completeAll = html.indexOf('Complete all')
    const clearAll = html.indexOf('Clear all')
    expect(add).toBeGreaterThan(-1)
    expect(completeAll).toBeGreaterThan(add)
    expect(clearAll).toBeGreaterThan(completeAll)

    // Nothing scheduled, so both bulk actions are unavailable.
    expect(html.slice(completeAll - 120, completeAll)).toContain('disabled')
  })

  it('puts the theme control in the settings dialog, not the header', () => {
    const html = renderToString(<App />)

    const settingsButton = html.indexOf('aria-label="Settings"')
    const dialog = html.indexOf('class="settings"')
    expect(settingsButton).toBeGreaterThan(-1)
    // The theme radiogroup now lives inside the dialog, after it in the markup.
    expect(html.indexOf('Colour theme')).toBeGreaterThan(dialog)
  })

  it('names the task, day and time range of anything outside the visible hours', () => {
    saveStateNow({
      ...defaultState(),
      settings: { startHour: 9, endHour: 17, theme: 'system' },
      tasks: [
        { id: 'a', title: 'Early gym', day: 'Wednesday', hour: 6, endHour: 8, completed: false },
        { id: 'b', title: 'Fits fine', day: 'Monday', hour: 10, endHour: 11, completed: false }
      ]
    })

    const html = renderToString(<App />)

    expect(html).toContain('1 task falls outside these hours')
    expect(html).toContain('Early gym')
    expect(html).toContain('Wednesday')
    expect(html).toContain('06:00 – 08:00')
    // The task that fits is not named in the warning.
    const warning = html.slice(html.indexOf('settings__warn'))
    expect(warning).not.toContain('Fits fine')
  })

  it('shows no warning when the range covers everything', () => {
    saveStateNow({
      ...defaultState(),
      tasks: [{ id: 'a', title: 'standup', day: 'Monday', hour: 9, endHour: 10, completed: false }]
    })

    const html = renderToString(<App />)
    expect(html).not.toContain('settings__warn')
  })

  it('draws a task written before durations existed as a single row', () => {
    saveStateNow({
      ...defaultState(),
      tasks: [{ id: 'a', title: 'standup', day: 'Monday', hour: 9, completed: false }]
    })

    const html = renderToString(<App />)
    expect(html).toContain('grid-row:4 / span 1')
  })
})
