import { afterEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import TaskChip, { DRAG_TYPE, SPAN_TYPE, spanFromTypes } from './TaskChip'
import {
  cleanup,
  click,
  dblclick,
  dragEvent,
  keyDown,
  mount,
  pointerDown,
  toggle,
  windowPointerUp
} from '../../test/dom'

describe('spanFromTypes', () => {
  it('reads the dragged task length out of the type list', () => {
    expect(spanFromTypes([DRAG_TYPE, `${SPAN_TYPE}4`])).toBe(4)
  })

  it('falls back to one hour when no span type is present', () => {
    // Dragging in from the Inbox, where the task has no times yet.
    expect(spanFromTypes([DRAG_TYPE])).toBe(1)
  })

  it('survives a missing or junk type list rather than rendering NaN cells', () => {
    expect(spanFromTypes(undefined)).toBe(1)
    expect(spanFromTypes([`${SPAN_TYPE}nonsense`])).toBe(1)
    expect(spanFromTypes([`${SPAN_TYPE}0`])).toBe(1)
    expect(spanFromTypes([`${SPAN_TYPE}-3`])).toBe(1)
  })

  it('accepts a DOMStringList-like object, not just an array', () => {
    expect(spanFromTypes({ length: 2, 0: DRAG_TYPE, 1: `${SPAN_TYPE}3` })).toBe(3)
  })
})

const TASK = {
  id: 't1',
  title: 'workshop',
  day: 'Tuesday',
  hour: 9,
  endHour: 12,
  completed: false
}

const handlers = () => ({
  onComplete: vi.fn(),
  onDelete: vi.fn(),
  onEdit: vi.fn(),
  onNudge: vi.fn(),
  onResize: vi.fn(),
  onResizeStart: vi.fn()
})

const render = (props = {}) => {
  const spies = handlers()
  const el = mount(<TaskChip task={TASK} {...spies} {...props} />)
  return { el, spies }
}

afterEach(cleanup)

describe('display', () => {
  it('shows the title and, for a long task, its range', () => {
    const { el } = render()
    expect(el.$('.chip__text').textContent).toBe('workshop')
    expect(el.$('.chip__meta').textContent).toBe('09:00 – 12:00')
    expect(el.$('.chip').className).toContain('chip--long')
  })

  it('hides the range on a one-hour task', () => {
    const { el } = render({ task: { ...TASK, endHour: 10 } })
    expect(el.$('.chip__meta')).toBeNull()
    expect(el.$('.chip').className).not.toContain('chip--long')
  })

  it('shows day and time together when asked, as the Inbox does', () => {
    const { el } = render({ task: { ...TASK, endHour: 10 }, showMeta: true })
    expect(el.$('.chip__meta').textContent).toBe('Tue · 09:00')
  })

  it('reads as unscheduled with no day or time', () => {
    const { el } = render({
      task: { ...TASK, day: null, hour: null, endHour: null },
      showMeta: true
    })
    expect(el.$('.chip__meta').textContent).toBe('Unscheduled')
    expect(el.$('.chip').getAttribute('aria-label')).toContain('Unscheduled')
  })

  it('names the task and its slot for a screen reader', () => {
    const { el } = render()
    expect(el.$('.chip').getAttribute('aria-label')).toBe('workshop, Tue · 09:00 – 12:00')
  })

  it('carries the full title in a tooltip, since it clamps to a few lines', () => {
    const { el } = render()
    expect(el.$('.chip__title').getAttribute('title')).toBe('workshop · 09:00 – 12:00')
  })

  it('drops the time from the tooltip when unscheduled', () => {
    const { el } = render({ task: { ...TASK, day: null, hour: null, endHour: null } })
    expect(el.$('.chip__title').getAttribute('title')).toBe('workshop')
  })
})

describe('mouse actions', () => {
  it('completes from the checkbox', () => {
    const { el, spies } = render()
    toggle(el.$('.chip__check'))
    expect(spies.onComplete).toHaveBeenCalledWith(TASK)
  })

  it('edits from the title and from a double click', () => {
    const { el, spies } = render()

    click(el.$('.chip__title'))
    expect(spies.onEdit).toHaveBeenCalledTimes(1)

    dblclick(el.$('.chip'))
    expect(spies.onEdit).toHaveBeenCalledTimes(2)
  })

  it('deletes from the X', () => {
    const { el, spies } = render()
    click(el.$('.chip__delete'))
    expect(spies.onDelete).toHaveBeenCalledWith(TASK)
  })
})

describe('keyboard', () => {
  it('opens the editor on Enter', () => {
    const { el, spies } = render()
    const { prevented } = keyDown(el.$('.chip'), 'Enter')

    expect(spies.onEdit).toHaveBeenCalledWith(TASK)
    expect(prevented).toBe(true)
  })

  it('deletes on Delete and on Backspace', () => {
    const { el, spies } = render()

    keyDown(el.$('.chip'), 'Delete')
    keyDown(el.$('.chip'), 'Backspace')
    expect(spies.onDelete).toHaveBeenCalledTimes(2)
  })

  it('moves a task with Ctrl or Cmd and the arrows', () => {
    const { el, spies } = render()

    keyDown(el.$('.chip'), 'ArrowLeft', { ctrlKey: true })
    keyDown(el.$('.chip'), 'ArrowRight', { ctrlKey: true })
    keyDown(el.$('.chip'), 'ArrowUp', { metaKey: true })
    keyDown(el.$('.chip'), 'ArrowDown', { metaKey: true })

    expect(spies.onNudge.mock.calls.map(c => [c[1], c[2]])).toEqual([
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1]
    ])
  })

  it('ignores arrows without a modifier', () => {
    const { el, spies } = render()
    keyDown(el.$('.chip'), 'ArrowDown')
    expect(spies.onNudge).not.toHaveBeenCalled()
  })

  it('ignores a modified key that is not an arrow', () => {
    const { el, spies } = render()
    keyDown(el.$('.chip'), 'x', { ctrlKey: true })
    expect(spies.onNudge).not.toHaveBeenCalled()
  })

  it('lengthens and shortens with Shift and the arrows', () => {
    const { el, spies } = render()

    keyDown(el.$('.chip'), 'ArrowDown', { shiftKey: true })
    expect(spies.onResize).toHaveBeenLastCalledWith('t1', 13)

    keyDown(el.$('.chip'), 'ArrowUp', { shiftKey: true })
    expect(spies.onResize).toHaveBeenLastCalledWith('t1', 11)
  })

  it('does not resize an unscheduled task', () => {
    const { el, spies } = render({ task: { ...TASK, hour: null, endHour: null } })
    keyDown(el.$('.chip'), 'ArrowDown', { shiftKey: true })
    expect(spies.onResize).not.toHaveBeenCalled()
  })

  it('falls through to nudging when Shift is held with a sideways arrow', () => {
    const { el, spies } = render()
    keyDown(el.$('.chip'), 'ArrowRight', { shiftKey: true, ctrlKey: true })

    expect(spies.onResize).not.toHaveBeenCalled()
    expect(spies.onNudge).toHaveBeenCalled()
  })

  it('does nothing when no nudge handler is supplied', () => {
    const el = mount(
      <TaskChip
        task={TASK}
        onComplete={() => {}}
        onDelete={() => {}}
        onEdit={() => {}}
      />
    )
    // Should not throw.
    keyDown(el.$('.chip'), 'ArrowDown', { ctrlKey: true })
  })
})

/**
 * The resize strip sits inside a draggable element, so pressing it used to start
 * a native drag and move the task instead of stretching it. These drive real DOM
 * events to keep that regression from coming back.
 */
describe('resize handle vs. native drag', () => {
  it('starts a resize and blocks the drag when the handle is pressed', () => {
    const { el, spies } = render()

    pointerDown(el.$('.chip__resize'))
    expect(spies.onResizeStart).toHaveBeenCalledTimes(1)
    expect(spies.onResizeStart.mock.calls[0][0]).toMatchObject({ id: 't1' })

    // This is the bug: without the guard the chip would start dragging here.
    const { prevented, data } = dragEvent(el.$('.chip'), 'dragstart')
    expect(prevented).toBe(true)
    expect(data).toEqual({})
  })

  it('cancels the press so the cell underneath does not also react', () => {
    const { el } = render()
    expect(pointerDown(el.$('.chip__resize'))).toBe(true)
  })

  it('drags normally again once the resize press is released', () => {
    const { el } = render()

    pointerDown(el.$('.chip__resize'))
    windowPointerUp()

    const { prevented, data } = dragEvent(el.$('.chip'), 'dragstart')
    expect(prevented).toBe(false)
    expect(data[DRAG_TYPE]).toBe('t1')
    // 09:00-12:00 is three hours, so the drop preview knows to span three rows.
    expect(data[`${SPAN_TYPE}3`]).toBe('')
  })

  it('drags straight away when the press lands on the chip body', () => {
    const { el } = render()

    pointerDown(el.$('.chip__body'))

    const { prevented, data } = dragEvent(el.$('.chip'), 'dragstart')
    expect(prevented).toBe(false)
    expect(data[DRAG_TYPE]).toBe('t1')
  })

  it('marks the chip while it is being dragged, and unmarks it after', () => {
    const { el } = render()

    dragEvent(el.$('.chip'), 'dragstart')
    expect(el.$('.chip').className).toContain('chip--dragging')

    dragEvent(el.$('.chip'), 'dragend')
    expect(el.$('.chip').className).not.toContain('chip--dragging')
  })

  it('offers no resize handle on an unscheduled task', () => {
    const { el } = render({ task: { ...TASK, day: null, hour: null, endHour: null } })
    expect(el.$('.chip__resize')).toBeNull()
  })

  it('offers no resize handle without a handler, as in the Inbox', () => {
    const el = mount(
      <TaskChip task={TASK} onComplete={() => {}} onDelete={() => {}} onEdit={() => {}} />
    )
    expect(el.$('.chip__resize')).toBeNull()
  })

  it('describes the current end time on the handle', () => {
    const { el } = render()
    expect(el.$('.chip__resize').getAttribute('title')).toContain('12:00')
  })
})
