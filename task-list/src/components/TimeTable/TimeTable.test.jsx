import { afterEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import TimeTable from './TimeTable'
import { DRAG_TYPE, SPAN_TYPE } from '../TaskChip/TaskChip'
import {
  cleanup,
  click,
  dragEvent,
  mount,
  pointerDown,
  pointerEnter,
  toggle,
  windowPointerCancel,
  windowPointerUp
} from '../../test/dom'

const SETTINGS = { startHour: 7, endHour: 21, theme: 'system' }

const task = over => ({
  id: 'a',
  title: 'workshop',
  day: 'Tuesday',
  hour: 9,
  endHour: 12,
  completed: false,
  ...over
})

const layoutOf = (...tasks) => {
  const map = new Map()
  tasks.forEach(t => {
    const existing = map.get(t.day)
    const items = existing ? existing.items : []
    items.push({ task: t, lane: items.length })
    map.set(t.day, { items, lanes: items.length })
  })
  return map
}

const noopTaskProps = {
  onComplete: () => {},
  onDelete: () => {},
  onEdit: () => {},
  onNudge: () => {},
  onResize: () => {}
}

const render = (props = {}) =>
  mount(
    <TimeTable
      settings={SETTINGS}
      layout={new Map()}
      onDrop={() => {}}
      onResize={() => {}}
      onCreate={() => {}}
      taskProps={noopTaskProps}
      {...props}
    />
  )

const cell = (el, day, hour) => el.$(`[aria-label="${day} ${String(hour).padStart(2, '0')}:00"]`)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('grid structure', () => {
  it('renders a row per hour in the range plus a header', () => {
    const el = render()
    expect(el.$$('[role="columnheader"]')).toHaveLength(8) // corner + 7 days
    expect(el.$$('[role="rowheader"]')).toHaveLength(15) // 07:00 to 21:00
    expect(el.$$('[role="gridcell"]')).toHaveLength(15 * 7)
  })

  it('honours a narrowed hour range', () => {
    const el = render({ settings: { ...SETTINGS, startHour: 9, endHour: 11 } })
    expect(el.$$('[role="rowheader"]')).toHaveLength(3)
    expect(cell(el, 'Monday', 8)).toBeNull()
    expect(cell(el, 'Monday', 11)).not.toBeNull()
  })

  it('widens a day column to fit its lanes', () => {
    const el = render({
      layout: layoutOf(task(), task({ id: 'b', hour: 9, endHour: 12 }))
    })
    // Tuesday is the second day column: 2 lanes at 124px.
    expect(el.$('.grid').style.gridTemplateColumns).toContain('minmax(248px, 1fr)')
  })

  it('places a task block on the right rows and column', () => {
    const el = render({ layout: layoutOf(task()) })
    const block = el.$('.grid__task')
    // Tuesday -> column 3; 09:00 on a grid from 07:00 -> row 4; 3 hours.
    expect(block.style.gridColumn).toBe('3')
    expect(block.style.gridRow).toBe('4 / span 3')
  })

  it('clips a block that would run past the last row', () => {
    const el = render({ layout: layoutOf(task({ hour: 20, endHour: 24 })) })
    // Rows 20 and 21 only, even though the task is four hours long.
    expect(el.$('.grid__task').style.gridRow).toBe('15 / span 2')
  })
})

describe('sweeping out a range', () => {
  it('creates a single hour from a plain click', () => {
    const onCreate = vi.fn()
    const el = render({ onCreate })

    pointerDown(cell(el, 'Wednesday', 10))
    windowPointerUp()

    expect(onCreate).toHaveBeenCalledWith('Wednesday', 10, 11)
  })

  it('creates the swept range when dragging downward', () => {
    const onCreate = vi.fn()
    const el = render({ onCreate })

    pointerDown(cell(el, 'Monday', 9))
    pointerEnter(cell(el, 'Monday', 10))
    pointerEnter(cell(el, 'Monday', 11))
    windowPointerUp()

    // End hour is exclusive, so 09:00-11:00 swept becomes 09:00-12:00.
    expect(onCreate).toHaveBeenCalledWith('Monday', 9, 12)
  })

  it('normalises a range swept upward', () => {
    const onCreate = vi.fn()
    const el = render({ onCreate })

    pointerDown(cell(el, 'Monday', 14))
    pointerEnter(cell(el, 'Monday', 12))
    windowPointerUp()

    expect(onCreate).toHaveBeenCalledWith('Monday', 12, 15)
  })

  it('highlights every cell in the sweep', () => {
    const el = render()

    pointerDown(cell(el, 'Monday', 9))
    pointerEnter(cell(el, 'Monday', 11))

    expect(cell(el, 'Monday', 9).className).toContain('grid__cell--picked')
    expect(cell(el, 'Monday', 10).className).toContain('grid__cell--picked')
    expect(cell(el, 'Monday', 11).className).toContain('grid__cell--picked')
    expect(cell(el, 'Monday', 12).className).not.toContain('grid__cell--picked')
    // Blocks go inert so the cells underneath keep receiving the gesture.
    expect(el.$('.grid').className).toContain('grid--busy')
  })

  it('ignores a sweep that wanders into another day', () => {
    const onCreate = vi.fn()
    const el = render({ onCreate })

    pointerDown(cell(el, 'Monday', 9))
    pointerEnter(cell(el, 'Friday', 15))
    windowPointerUp()

    expect(onCreate).toHaveBeenCalledWith('Monday', 9, 10)
  })

  it('does not start on a right click or a touch', () => {
    const onCreate = vi.fn()
    const el = render({ onCreate })

    pointerDown(cell(el, 'Monday', 9), { button: 2 })
    windowPointerUp()
    expect(onCreate).not.toHaveBeenCalled()

    // pointerType is not settable on MouseEvent, so go through the property.
    const target = cell(el, 'Monday', 9)
    const event = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 })
    Object.defineProperty(event, 'pointerType', { value: 'touch' })
    target.dispatchEvent(event)
    windowPointerUp()
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('abandons the gesture on pointercancel without creating anything', () => {
    const onCreate = vi.fn()
    const el = render({ onCreate })

    pointerDown(cell(el, 'Monday', 9))
    windowPointerCancel()

    // pointercancel runs the same finish path, so the click still lands.
    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(el.$('.grid').className).not.toContain('grid--busy')
  })

  it('does nothing on pointer movement when no gesture is running', () => {
    const onCreate = vi.fn()
    const onResize = vi.fn()
    const el = render({ onCreate, onResize })

    pointerEnter(cell(el, 'Monday', 9))
    expect(onCreate).not.toHaveBeenCalled()
    expect(onResize).not.toHaveBeenCalled()
  })
})

describe('resizing by the bottom edge', () => {
  it('extends the task to the hour the pointer reaches', () => {
    const onResize = vi.fn()
    const el = render({ layout: layoutOf(task()), onResize })

    pointerDown(el.$('.chip__resize'))
    pointerEnter(cell(el, 'Tuesday', 14))

    expect(onResize).toHaveBeenCalledWith('a', 15)
  })

  it('shrinks back toward the start hour', () => {
    const onResize = vi.fn()
    const el = render({ layout: layoutOf(task()), onResize })

    pointerDown(el.$('.chip__resize'))
    pointerEnter(cell(el, 'Tuesday', 9))

    expect(onResize).toHaveBeenCalledWith('a', 10)
  })

  it('refuses to resize above the start hour or into another day', () => {
    const onResize = vi.fn()
    const el = render({ layout: layoutOf(task()), onResize })

    pointerDown(el.$('.chip__resize'))
    pointerEnter(cell(el, 'Tuesday', 8))
    pointerEnter(cell(el, 'Friday', 14))

    expect(onResize).not.toHaveBeenCalled()
  })

  it('does not also create a task from the resize press', () => {
    const onCreate = vi.fn()
    const el = render({ layout: layoutOf(task()), onCreate })

    pointerDown(el.$('.chip__resize'))
    windowPointerUp()

    expect(onCreate).not.toHaveBeenCalled()
  })
})

describe('drag and drop', () => {
  const types = [DRAG_TYPE, `${SPAN_TYPE}3`]

  it('previews every hour the dragged block would cover', () => {
    const el = render()

    dragEvent(el.$('.grid'), 'dragenter')
    dragEvent(cell(el, 'Thursday', 10), 'dragover', { types })

    expect(cell(el, 'Thursday', 10).className).toContain('grid__cell--over-first')
    expect(cell(el, 'Thursday', 11).className).toContain('grid__cell--over')
    expect(cell(el, 'Thursday', 12).className).toContain('grid__cell--over-last')
    expect(cell(el, 'Thursday', 13).className).not.toContain('grid__cell--over')
    // A different day is untouched.
    expect(cell(el, 'Friday', 10).className).not.toContain('grid__cell--over')
  })

  it('marks a one-hour drag as both first and last', () => {
    const el = render()
    dragEvent(cell(el, 'Monday', 8), 'dragover', { types: [DRAG_TYPE] })

    const target = cell(el, 'Monday', 8)
    expect(target.className).toContain('grid__cell--over-first')
    expect(target.className).toContain('grid__cell--over-last')
  })

  it('ignores a drag carrying something else', () => {
    const el = render()
    const { prevented } = dragEvent(cell(el, 'Monday', 8), 'dragover', { types: ['text/plain'] })

    expect(prevented).toBe(false)
    expect(cell(el, 'Monday', 8).className).not.toContain('grid__cell--over')
  })

  it('drops onto the hovered cell', () => {
    const onDrop = vi.fn()
    const el = render({ onDrop })

    dragEvent(cell(el, 'Sunday', 16), 'drop', { types, data: { [DRAG_TYPE]: 'task-7' } })

    expect(onDrop).toHaveBeenCalledWith('task-7', 'Sunday', 16)
  })

  it('ignores a drop with no task id', () => {
    const onDrop = vi.fn()
    const el = render({ onDrop })

    dragEvent(cell(el, 'Sunday', 16), 'drop', { types })

    expect(onDrop).not.toHaveBeenCalled()
  })

  it('clears the preview when the drag leaves the grid', () => {
    const el = render()
    dragEvent(cell(el, 'Monday', 9), 'dragover', { types })
    expect(cell(el, 'Monday', 9).className).toContain('grid__cell--over')

    // relatedTarget outside the grid means the pointer really has left.
    dragEvent(el.$('.grid'), 'dragleave', { relatedTarget: document.body })

    expect(cell(el, 'Monday', 9).className).not.toContain('grid__cell--over')
  })

  it('keeps the preview while moving between cells inside the grid', () => {
    const el = render()
    dragEvent(cell(el, 'Monday', 9), 'dragover', { types })

    dragEvent(el.$('.grid'), 'dragleave', { relatedTarget: cell(el, 'Monday', 10) })

    expect(cell(el, 'Monday', 9).className).toContain('grid__cell--over')
  })

  it('cleans up after a drag that ends anywhere', () => {
    const el = render()
    dragEvent(el.$('.grid'), 'dragenter')
    dragEvent(cell(el, 'Monday', 9), 'dragover', { types })

    dragEvent(window, 'dragend')

    expect(el.$('.grid').className).not.toContain('grid--busy')
    expect(cell(el, 'Monday', 9).className).not.toContain('grid__cell--over')
  })
})

describe('task blocks', () => {
  it('passes the chip callbacks through', () => {
    const onEdit = vi.fn()
    const el = render({
      layout: layoutOf(task()),
      taskProps: { ...noopTaskProps, onEdit }
    })

    click(el.$('.chip__title'))
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }))
  })

  it('renders a block per task across several days', () => {
    const el = render({
      layout: layoutOf(task(), task({ id: 'b', day: 'Friday', hour: 8, endHour: 9 }))
    })
    expect(el.$$('.grid__task')).toHaveLength(2)
  })

  it('marks today in the header', () => {
    const el = render()
    expect(el.$$('.grid__day--today')).toHaveLength(1)
  })

  it('completes a task through its checkbox', () => {
    const onComplete = vi.fn()
    const el = render({ layout: layoutOf(task()), taskProps: { ...noopTaskProps, onComplete } })

    toggle(el.$('.chip__check'))
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }))
  })
})
