import { afterEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import Composer from './Composer'
import { change, cleanup, click, keyDown, mount, type } from '../../test/dom'

const SETTINGS = { startHour: 7, endHour: 21, theme: 'system' }

const render = (props = {}) =>
  mount(
    <Composer
      settings={SETTINGS}
      onAdd={() => {}}
      onCompleteAll={() => {}}
      onClearAll={() => {}}
      taskCount={3}
      {...props}
    />
  )

const fields = el => {
  const [day, start, end] = el.$$('select')
  return { title: el.$('.composer__title'), day, start, end }
}

afterEach(cleanup)

describe('adding a task', () => {
  it('adds an unscheduled task when no day or time is chosen', () => {
    const onAdd = vi.fn()
    const el = render({ onAdd })

    type(fields(el).title, 'water the plants')
    click(el.button('Add task'))

    expect(onAdd).toHaveBeenCalledWith({
      title: 'water the plants',
      day: null,
      hour: null,
      endHour: null
    })
  })

  it('adds with the chosen day and range', () => {
    const onAdd = vi.fn()
    const el = render({ onAdd })
    const f = fields(el)

    type(f.title, 'standup')
    change(f.day, 'Wednesday')
    change(f.start, '9')
    change(f.end, '11')
    click(el.button('Add task'))

    expect(onAdd).toHaveBeenCalledWith({
      title: 'standup',
      day: 'Wednesday',
      hour: 9,
      endHour: 11
    })
  })

  it('adds on Enter and clears the field afterwards', () => {
    const onAdd = vi.fn()
    const el = render({ onAdd })

    type(fields(el).title, 'quick one')
    keyDown(fields(el).title, 'Enter')

    expect(onAdd).toHaveBeenCalled()
    expect(fields(el).title.value).toBe('')
  })

  it('trims the title', () => {
    const onAdd = vi.fn()
    const el = render({ onAdd })

    type(fields(el).title, '   padded   ')
    click(el.button('Add task'))

    expect(onAdd.mock.calls[0][0].title).toBe('padded')
  })

  it('refuses an empty title and says so', () => {
    const onAdd = vi.fn()
    const el = render({ onAdd })

    click(el.button('Add task'))

    expect(onAdd).not.toHaveBeenCalled()
    expect(el.text()).toContain('Enter a task first.')
    expect(fields(el).title.getAttribute('aria-invalid')).toBe('true')
  })

  it('refuses whitespace alone', () => {
    const onAdd = vi.fn()
    const el = render({ onAdd })

    type(fields(el).title, '    ')
    click(el.button('Add task'))
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('drops the error as soon as typing resumes', () => {
    const el = render()
    click(el.button('Add task'))
    expect(el.text()).toContain('Enter a task first.')

    type(fields(el).title, 'a')
    expect(el.text()).not.toContain('Enter a task first.')
  })

  it('clears the field on Escape', () => {
    const el = render()
    type(fields(el).title, 'never mind')
    keyDown(fields(el).title, 'Escape')
    expect(fields(el).title.value).toBe('')
  })

  it('ignores other keys', () => {
    const onAdd = vi.fn()
    const el = render({ onAdd })
    type(fields(el).title, 'x')
    keyDown(fields(el).title, 'a')
    expect(onAdd).not.toHaveBeenCalled()
  })
})

describe('the time pair', () => {
  it('disables the end until a start is picked', () => {
    const el = render()
    expect(fields(el).end.disabled).toBe(true)

    change(fields(el).start, '9')
    expect(fields(el).end.disabled).toBe(false)
  })

  it('defaults the end to an hour after the start', () => {
    const el = render()
    change(fields(el).start, '14')
    expect(fields(el).end.value).toBe('15')
  })

  it('pushes the end along when the start overtakes it', () => {
    const el = render()
    change(fields(el).start, '9')
    change(fields(el).end, '10')
    change(fields(el).start, '15')
    expect(fields(el).end.value).toBe('16')
  })

  it('only offers end hours after the start', () => {
    const el = render()
    change(fields(el).start, '19')

    const options = Array.from(fields(el).end.options).map(o => Number(o.value))
    expect(Math.min(...options)).toBe(20)
    // One past the final row, so a task can run to the end of the day.
    expect(Math.max(...options)).toBe(22)
  })

  it('resets the end when the start goes back to any time', () => {
    const el = render()
    change(fields(el).start, '9')
    change(fields(el).start, '')

    expect(fields(el).end.value).toBe('')
    expect(fields(el).end.disabled).toBe(true)
  })

  it('falls back to a one-hour task if the end is somehow blank', () => {
    const onAdd = vi.fn()
    const el = render({ onAdd })
    const f = fields(el)

    type(f.title, 'x')
    change(f.start, '9')
    change(f.end, '')
    click(el.button('Add task'))

    expect(onAdd.mock.calls[0][0]).toMatchObject({ hour: 9, endHour: 10 })
  })
})

describe('pre-filling from the grid', () => {
  it('takes the day and range swept out on the grid', () => {
    const el = render()
    el.render(
      <Composer
        settings={SETTINGS}
        onAdd={() => {}}
        onCompleteAll={() => {}}
        onClearAll={() => {}}
        defaults={{ day: 'Friday', hour: 13, endHour: 16, at: 1 }}
      />
    )

    const f = fields(el)
    expect(f.day.value).toBe('Friday')
    expect(f.start.value).toBe('13')
    expect(f.end.value).toBe('16')
    expect(document.activeElement).toBe(f.title)
  })

  it('handles a pre-fill with no times', () => {
    const el = render()
    el.render(
      <Composer
        settings={SETTINGS}
        onAdd={() => {}}
        onCompleteAll={() => {}}
        onClearAll={() => {}}
        defaults={{ day: 'Friday', hour: null, endHour: null, at: 1 }}
      />
    )

    expect(fields(el).start.value).toBe('')
    expect(fields(el).end.value).toBe('')
  })
})

describe('bulk actions', () => {
  it('wires up Complete all and Clear all', () => {
    const onCompleteAll = vi.fn()
    const onClearAll = vi.fn()
    const el = render({ onCompleteAll, onClearAll })

    click(el.button('Complete all'))
    click(el.button('Clear all'))

    expect(onCompleteAll).toHaveBeenCalled()
    expect(onClearAll).toHaveBeenCalled()
  })

  it('disables both when there is nothing scheduled', () => {
    const el = render({ taskCount: 0 })
    expect(el.button('Complete all').disabled).toBe(true)
    expect(el.button('Clear all').disabled).toBe(true)
  })
})
