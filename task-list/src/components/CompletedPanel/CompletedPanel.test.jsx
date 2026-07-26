import { afterEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import CompletedPanel from './CompletedPanel'
import { cleanup, click, mount, toggle } from '../../test/dom'

const done = over => ({
  id: 'a',
  title: 'standup',
  day: 'Monday',
  hour: 9,
  endHour: 10,
  completedAt: 1,
  ...over
})

const render = (props = {}) =>
  mount(
    <CompletedPanel
      tasks={[]}
      onRestore={() => {}}
      onDelete={() => {}}
      onClear={() => {}}
      {...props}
    />
  )

afterEach(cleanup)

describe('CompletedPanel', () => {
  it('explains itself when empty, with Clear unavailable', () => {
    const el = render()
    expect(el.text()).toContain('Nothing done yet')
    expect(el.$('.done__count').textContent).toBe('0')
    expect(el.button('Clear').disabled).toBe(true)
  })

  it('lists completed tasks with a count', () => {
    const el = render({ tasks: [done(), done({ id: 'b', title: 'review' })] })
    expect(el.$$('.done__item')).toHaveLength(2)
    expect(el.$('.done__count').textContent).toBe('2')
  })

  it('shows the day and range a task was completed from', () => {
    const el = render({ tasks: [done({ hour: 9, endHour: 12 })] })
    expect(el.$('.done__meta').textContent).toBe('Mon · 09:00 – 12:00')
  })

  it('shows only the day when there is no time', () => {
    const el = render({ tasks: [done({ hour: null, endHour: null })] })
    expect(el.$('.done__meta').textContent).toBe('Mon')
  })

  it('shows only the time when there is no day, as with v1 imports', () => {
    const el = render({ tasks: [done({ day: null })] })
    expect(el.$('.done__meta').textContent).toBe('09:00')
  })

  it('omits the meta line entirely when neither is known', () => {
    const el = render({ tasks: [done({ day: null, hour: null, endHour: null })] })
    expect(el.$('.done__meta')).toBeNull()
  })

  it('restores a task when unticked', () => {
    const onRestore = vi.fn()
    const el = render({ tasks: [done()], onRestore })

    toggle(el.$('input[type="checkbox"]'))
    expect(onRestore).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }))
  })

  it('deletes a single task for good', () => {
    const onDelete = vi.fn()
    const el = render({ tasks: [done()], onDelete })

    click(el.$('.done__delete'))
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }))
  })

  it('clears the whole list', () => {
    const onClear = vi.fn()
    const el = render({ tasks: [done()], onClear })

    click(el.button('Clear'))
    expect(onClear).toHaveBeenCalled()
  })
})
