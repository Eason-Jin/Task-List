import { afterEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import TaskChip, { DRAG_TYPE, SPAN_TYPE, spanFromTypes } from './TaskChip'

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

/**
 * The resize strip sits inside a draggable element, so pressing it used to start
 * a native drag and move the task instead of stretching it. These drive real DOM
 * events to keep that regression from coming back.
 */
describe('resize handle vs. native drag', () => {
  const TASK = {
    id: 't1',
    title: 'workshop',
    day: 'Tuesday',
    hour: 9,
    endHour: 12,
    completed: false
  }

  let container = null
  let root = null

  const mount = props => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    flushSync(() => {
      root.render(
        <TaskChip
          task={TASK}
          onComplete={() => {}}
          onDelete={() => {}}
          onEdit={() => {}}
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

  // jsdom has no DragEvent, so stand one up with just the bits React touches.
  const fireDragStart = node => {
    const event = new Event('dragstart', { bubbles: true, cancelable: true })
    const setData = vi.fn()
    event.dataTransfer = { setData, get types() { return [] }, effectAllowed: '' }
    node.dispatchEvent(event)
    return { prevented: event.defaultPrevented, setData }
  }

  const firePointerDown = node =>
    node.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 })
    )

  it('starts a resize and blocks the drag when the handle is pressed', () => {
    const onResizeStart = vi.fn()
    const el = mount({ onResizeStart })

    const handle = el.querySelector('.chip__resize')
    expect(handle).not.toBeNull()

    firePointerDown(handle)
    expect(onResizeStart).toHaveBeenCalledTimes(1)
    expect(onResizeStart.mock.calls[0][0]).toMatchObject({ id: 't1' })

    // This is the bug: without the guard the chip would start dragging here.
    const { prevented, setData } = fireDragStart(el.querySelector('.chip'))
    expect(prevented).toBe(true)
    expect(setData).not.toHaveBeenCalled()
  })

  it('does not swallow the press for the cell underneath twice over', () => {
    const onResizeStart = vi.fn()
    const el = mount({ onResizeStart })
    const handle = el.querySelector('.chip__resize')

    // stopPropagation means the grid cell never sees it, and preventDefault
    // suppresses the compatibility mousedown that begins drag detection.
    const notCancelled = firePointerDown(handle)
    expect(notCancelled).toBe(false)
    expect(onResizeStart).toHaveBeenCalled()
  })

  it('drags normally again once the resize press is released', () => {
    const el = mount({ onResizeStart: () => {} })

    firePointerDown(el.querySelector('.chip__resize'))
    window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }))

    const { prevented, setData } = fireDragStart(el.querySelector('.chip'))
    expect(prevented).toBe(false)
    expect(setData).toHaveBeenCalledWith(DRAG_TYPE, 't1')
    // 09:00-12:00 is three hours, so the drop preview knows to span three rows.
    expect(setData).toHaveBeenCalledWith(`${SPAN_TYPE}3`, '')
  })

  it('drags straight away when the press lands on the chip body', () => {
    const el = mount({ onResizeStart: () => {} })

    firePointerDown(el.querySelector('.chip__body'))

    const { prevented, setData } = fireDragStart(el.querySelector('.chip'))
    expect(prevented).toBe(false)
    expect(setData).toHaveBeenCalledWith(DRAG_TYPE, 't1')
  })

  it('offers no resize handle on an unscheduled task', () => {
    const el = mount({
      task: { ...TASK, day: null, hour: null, endHour: null },
      onResizeStart: () => {}
    })
    expect(el.querySelector('.chip__resize')).toBeNull()
  })
})
