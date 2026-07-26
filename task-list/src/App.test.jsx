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

  it('draws a task written before durations existed as a single row', () => {
    saveStateNow({
      ...defaultState(),
      tasks: [{ id: 'a', title: 'standup', day: 'Monday', hour: 9, completed: false }]
    })

    const html = renderToString(<App />)
    expect(html).toContain('grid-row:4 / span 1')
  })
})
