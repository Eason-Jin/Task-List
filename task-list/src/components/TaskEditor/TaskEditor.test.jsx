import { afterEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import TaskEditor from './TaskEditor'
import { change, cleanup, click, mount, submit, type } from '../../test/dom'

const SETTINGS = { startHour: 7, endHour: 21, theme: 'system' }

const TASK = {
  id: 'a',
  title: 'workshop',
  day: 'Tuesday',
  hour: 9,
  endHour: 12,
  completed: false
}

const render = (props = {}) =>
  mount(
    <TaskEditor task={null} settings={SETTINGS} onSave={() => {}} onClose={() => {}} {...props} />
  )

const fields = el => {
  const [day, start, end] = el.$$('select')
  return { title: el.$('input[type="text"]'), day, start, end }
}

afterEach(cleanup)

describe('TaskEditor', () => {
  it('stays shut with no task', () => {
    const el = render()
    expect(el.$('dialog').open).toBe(false)
  })

  it('opens pre-filled from the task', () => {
    const el = render({ task: TASK })
    const f = fields(el)

    expect(el.$('dialog').open).toBe(true)
    expect(f.title.value).toBe('workshop')
    expect(f.day.value).toBe('Tuesday')
    expect(f.start.value).toBe('9')
    expect(f.end.value).toBe('12')
  })

  it('shows an unscheduled task with empty times', () => {
    const el = render({ task: { ...TASK, day: null, hour: null, endHour: null } })
    const f = fields(el)

    expect(f.day.value).toBe('')
    expect(f.start.value).toBe('')
    expect(f.end.value).toBe('')
    expect(f.end.disabled).toBe(true)
  })

  it('saves the edited values', () => {
    const onSave = vi.fn()
    const el = render({ task: TASK, onSave })
    const f = fields(el)

    type(f.title, 'workshop v2')
    change(f.day, 'Friday')
    change(f.start, '14')
    change(f.end, '16')
    click(el.button('Save'))

    expect(onSave).toHaveBeenCalledWith({
      id: 'a',
      title: 'workshop v2',
      day: 'Friday',
      hour: 14,
      endHour: 16
    })
  })

  it('saves on submitting the form, not just the button', () => {
    const onSave = vi.fn()
    const el = render({ task: TASK, onSave })

    submit(el.$('form'))
    expect(onSave).toHaveBeenCalled()
  })

  it('trims the title and refuses an empty one', () => {
    const onSave = vi.fn()
    const el = render({ task: TASK, onSave })

    type(fields(el).title, '   ')
    click(el.button('Save'))
    expect(onSave).not.toHaveBeenCalled()

    type(fields(el).title, '  trimmed  ')
    click(el.button('Save'))
    expect(onSave.mock.calls[0][0].title).toBe('trimmed')
  })

  it('unschedules a task by clearing the start', () => {
    const onSave = vi.fn()
    const el = render({ task: TASK, onSave })

    change(fields(el).start, '')
    click(el.button('Save'))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ hour: null, endHour: null }))
  })

  it('pushes the end along when the start overtakes it', () => {
    const el = render({ task: TASK })
    change(fields(el).start, '15')
    expect(fields(el).end.value).toBe('16')
  })

  it('keeps a valid end when the start moves below it', () => {
    const el = render({ task: TASK })
    change(fields(el).start, '8')
    expect(fields(el).end.value).toBe('12')
  })

  it('falls back to one hour if the end is blank on save', () => {
    const onSave = vi.fn()
    const el = render({ task: { ...TASK, day: null, hour: null, endHour: null }, onSave })

    type(fields(el).title, 'later')
    change(fields(el).start, '10')
    change(fields(el).end, '')
    click(el.button('Save'))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ hour: 10, endHour: 11 }))
  })

  it('cancels without saving', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    const el = render({ task: TASK, onSave, onClose })

    click(el.button('Cancel'))
    expect(onClose).toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('closes when the task is cleared, and treats Escape as a close', () => {
    const onClose = vi.fn()
    const el = render({ task: TASK, onClose })

    el.$('dialog').close()
    expect(onClose).toHaveBeenCalled()

    el.render(<TaskEditor task={null} settings={SETTINGS} onSave={() => {}} onClose={onClose} />)
    expect(el.$('dialog').open).toBe(false)
  })

  it('reloads its fields when swapped to a different task', () => {
    const el = render({ task: TASK })
    el.render(
      <TaskEditor
        task={{ ...TASK, id: 'b', title: 'other', day: 'Sunday', hour: 8, endHour: 9 }}
        settings={SETTINGS}
        onSave={() => {}}
        onClose={() => {}}
      />
    )

    expect(fields(el).title.value).toBe('other')
    expect(fields(el).day.value).toBe('Sunday')
  })
})
