import { afterEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import SettingsDialog from './SettingsDialog'
import { change, cleanup, click, mount } from '../../test/dom'

const SETTINGS = { startHour: 7, endHour: 21, theme: 'system' }

const task = over => ({
  id: 'a',
  title: 'Early gym',
  day: 'Wednesday',
  hour: 6,
  endHour: 8,
  completed: false,
  ...over
})

const props = (over = {}) => ({
  open: true,
  settings: SETTINGS,
  tasks: [],
  onSave: () => {},
  onClose: () => {},
  ...over
})

const render = (over = {}) => mount(<SettingsDialog {...props(over)} />)

const selects = el => {
  const [start, end] = el.$$('select')
  return { start, end }
}

afterEach(cleanup)

describe('opening and closing', () => {
  it('stays shut until open', () => {
    const el = render({ open: false })
    expect(el.$('dialog').open).toBe(false)
  })

  it('opens and closes with the flag', () => {
    const el = render({ open: false })
    el.render(<SettingsDialog {...props({ open: true })} />)
    expect(el.$('dialog').open).toBe(true)

    el.render(<SettingsDialog {...props({ open: false })} />)
    expect(el.$('dialog').open).toBe(false)
  })

  it('treats a native close, such as Escape, as a cancel', () => {
    const onClose = vi.fn()
    const el = render({ onClose })

    el.$('dialog').close()
    expect(onClose).toHaveBeenCalled()
  })

  it('starts again from the saved values each time it opens', () => {
    const el = render()
    change(selects(el).start, '11')
    expect(selects(el).start.value).toBe('11')

    el.render(<SettingsDialog {...props({ open: false })} />)
    el.render(<SettingsDialog {...props({ open: true })} />)

    expect(selects(el).start.value).toBe('7')
  })
})

describe('draft editing', () => {
  it('saves the draft only when Save is pressed', () => {
    const onSave = vi.fn()
    const el = render({ onSave })

    change(selects(el).start, '9')
    expect(onSave).not.toHaveBeenCalled()

    click(el.button('Save'))
    expect(onSave).toHaveBeenCalledWith({ startHour: 9, endHour: 21, theme: 'system' })
  })

  it('discards the draft on Cancel', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    const el = render({ onSave, onClose })

    change(selects(el).start, '10')
    click(el.button('Cancel'))

    expect(onClose).toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('keeps the theme in the draft rather than applying it straight away', () => {
    const onSave = vi.fn()
    const el = render({ onSave })

    click(el.$('[role="radio"][aria-checked="false"]'))
    expect(onSave).not.toHaveBeenCalled()

    click(el.button('Save'))
    expect(onSave.mock.calls[0][0].theme).toBe('light')
  })

  it('never offers an end hour before the start', () => {
    const el = render()
    change(selects(el).start, '18')

    const ends = Array.from(selects(el).end.options).map(o => Number(o.value))
    expect(Math.min(...ends)).toBe(18)
    // The end was pulled along rather than left dangling below the new start.
    expect(Number(selects(el).end.value)).toBe(21)
  })

  it('drags the end up when the start overtakes it', () => {
    const el = render()
    change(selects(el).start, '23')
    expect(Number(selects(el).end.value)).toBe(23)
  })

  it('changes the end on its own', () => {
    const onSave = vi.fn()
    const el = render({ onSave })

    change(selects(el).end, '17')
    click(el.button('Save'))

    expect(onSave).toHaveBeenCalledWith({ startHour: 7, endHour: 17, theme: 'system' })
  })
})

describe('tasks outside the range', () => {
  it('refuses to save while a task falls outside', () => {
    const onSave = vi.fn()
    const el = render({ tasks: [task()], settings: { ...SETTINGS, startHour: 9 }, onSave })

    const save = el.button('Save')
    expect(save.disabled).toBe(true)

    click(save)
    expect(onSave).not.toHaveBeenCalled()
    expect(save.getAttribute('title')).toContain('Widen the range')
  })

  it('names the offending task, its day and its range', () => {
    const el = render({ tasks: [task()], settings: { ...SETTINGS, startHour: 9 } })
    const warning = el.$('.settings__warn')

    expect(warning).not.toBeNull()
    expect(warning.textContent).toContain('This task is outside the range:')
    expect(warning.textContent).toContain('Early gym')
    expect(warning.textContent).toContain('Wednesday')
    expect(warning.textContent).toContain('06:00 – 08:00')
  })

  it('switches to the plural wording for several tasks', () => {
    const el = render({
      tasks: [task(), task({ id: 'b', title: 'Late run', day: 'Friday', hour: 5, endHour: 6 })],
      settings: { ...SETTINGS, startHour: 9 }
    })

    const warning = el.$('.settings__warn')
    expect(warning.textContent).toContain('These tasks are outside the range:')
    expect(el.$$('.settings__warn-list li')).toHaveLength(2)
  })

  it('re-enables Save as soon as the range is widened to fit', () => {
    const el = render({ tasks: [task()], settings: { ...SETTINGS, startHour: 9 } })
    expect(el.button('Save').disabled).toBe(true)

    // Day starts at 06:00 — the task now fits.
    change(selects(el).start, '6')

    expect(el.$('.settings__warn')).toBeNull()
    expect(el.button('Save').disabled).toBe(false)
    expect(el.button('Save').getAttribute('title')).toBeNull()
  })

  it('blocks saving when the range would clip the tail of a task', () => {
    // 20:00-23:00 occupies rows 20, 21 and 22; a day ending at 21 cuts it short.
    const el = render({ tasks: [task({ hour: 20, endHour: 23 })] })
    expect(el.button('Save').disabled).toBe(true)

    change(selects(el).end, '22')
    expect(el.button('Save').disabled).toBe(false)
  })

  it('shows no warning when everything fits', () => {
    const el = render({ tasks: [task({ hour: 10, endHour: 11 })] })
    expect(el.$('.settings__warn')).toBeNull()
    expect(el.button('Save').disabled).toBe(false)
  })
})
