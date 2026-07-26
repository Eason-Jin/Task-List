import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import SettingsDialog from './SettingsDialog'

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

describe('SettingsDialog', () => {
  let container = null
  let root = null

  // jsdom implements <dialog> but not showModal in every version.
  beforeEach(() => {
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function showModal() {
        this.open = true
      }
      HTMLDialogElement.prototype.close = function close() {
        this.open = false
      }
    }
  })

  const mount = props => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    flushSync(() => {
      root.render(
        <SettingsDialog
          open
          settings={SETTINGS}
          tasks={[]}
          onSave={() => {}}
          onClose={() => {}}
          {...props}
        />
      )
    })
    return container
  }

  afterEach(() => {
    if (root) flushSync(() => root.unmount())
    container?.remove()
    root = null
    container = null
  })

  const buttonNamed = (el, text) =>
    Array.from(el.querySelectorAll('button')).find(b => b.textContent.trim() === text)

  const click = node => {
    flushSync(() => {
      node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })
  }

  const change = (node, value) => {
    flushSync(() => {
      node.value = value
      node.dispatchEvent(new Event('change', { bubbles: true }))
    })
  }

  it('saves the draft only when Save is pressed', () => {
    const onSave = vi.fn()
    const el = mount({ onSave })

    change(el.querySelectorAll('select')[0], '9')
    // Nothing committed yet.
    expect(onSave).not.toHaveBeenCalled()

    click(buttonNamed(el, 'Save'))
    expect(onSave).toHaveBeenCalledWith({ startHour: 9, endHour: 21, theme: 'system' })
  })

  it('discards the draft on Cancel', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    const el = mount({ onSave, onClose })

    change(el.querySelectorAll('select')[0], '10')
    click(buttonNamed(el, 'Cancel'))

    expect(onClose).toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('keeps the theme in the draft rather than applying it straight away', () => {
    const onSave = vi.fn()
    const el = mount({ onSave })

    click(el.querySelector('[role="radio"][aria-checked="false"]'))
    expect(onSave).not.toHaveBeenCalled()

    click(buttonNamed(el, 'Save'))
    expect(onSave.mock.calls[0][0].theme).toBe('light')
  })

  it('refuses to save while a task falls outside the range', () => {
    const onSave = vi.fn()
    const el = mount({ tasks: [task()], settings: { ...SETTINGS, startHour: 9 }, onSave })

    const save = buttonNamed(el, 'Save')
    expect(save.disabled).toBe(true)

    click(save)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('names the offending task, its day and its range', () => {
    const el = mount({ tasks: [task()], settings: { ...SETTINGS, startHour: 9 } })
    const warning = el.querySelector('.settings__warn')

    expect(warning).not.toBeNull()
    expect(warning.textContent).toContain('This task is outside the range:')
    expect(warning.textContent).toContain('Early gym')
    expect(warning.textContent).toContain('Wednesday')
    expect(warning.textContent).toContain('06:00 – 08:00')
  })

  it('re-enables Save as soon as the range is widened to fit', () => {
    const el = mount({ tasks: [task()], settings: { ...SETTINGS, startHour: 9 } })
    expect(buttonNamed(el, 'Save').disabled).toBe(true)

    // Day starts at 06:00 — the task now fits.
    change(el.querySelectorAll('select')[0], '6')

    expect(el.querySelector('.settings__warn')).toBeNull()
    expect(buttonNamed(el, 'Save').disabled).toBe(false)
  })

  it('blocks saving when the range would clip the tail of a task', () => {
    // 20:00-23:00 occupies rows 20, 21 and 22; a day ending at 21 cuts it short.
    const el = mount({ tasks: [task({ hour: 20, endHour: 23 })] })
    expect(buttonNamed(el, 'Save').disabled).toBe(true)

    change(el.querySelectorAll('select')[1], '22')
    expect(buttonNamed(el, 'Save').disabled).toBe(false)
  })

  it('never offers an end hour before the start', () => {
    const el = mount({})
    change(el.querySelectorAll('select')[0], '18')

    const ends = Array.from(el.querySelectorAll('select')[1].options).map(o => Number(o.value))
    expect(Math.min(...ends)).toBe(18)
    // The end was pulled along rather than left dangling below the new start.
    expect(Number(el.querySelectorAll('select')[1].value)).toBe(21)
  })
})
