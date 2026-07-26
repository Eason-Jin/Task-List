import { afterEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import Inbox from './Inbox'
import { DRAG_TYPE, SPAN_TYPE } from '../TaskChip/TaskChip'
import { cleanup, click, dragEvent, mount } from '../../test/dom'

const task = over => ({
  id: 'a',
  title: 'loose end',
  day: null,
  hour: null,
  endHour: null,
  completed: false,
  ...over
})

const noopTaskProps = {
  onComplete: () => {},
  onDelete: () => {},
  onEdit: () => {},
  onNudge: () => {},
  onResize: () => {}
}

const render = (props = {}) =>
  mount(<Inbox tasks={[]} onDrop={() => {}} taskProps={noopTaskProps} {...props} />)

afterEach(cleanup)

describe('Inbox', () => {
  it('invites a drop when empty', () => {
    const el = render()
    expect(el.text()).toContain('Drop a task here to unschedule it')
    expect(el.$('.inbox__count').textContent).toBe('0')
  })

  it('lists its tasks with a count', () => {
    const el = render({ tasks: [task(), task({ id: 'b', title: 'second' })] })
    expect(el.$$('.chip')).toHaveLength(2)
    expect(el.$('.inbox__count').textContent).toBe('2')
    expect(el.$('.inbox__empty')).toBeNull()
  })

  it('shows the day and time of a partly scheduled task', () => {
    const el = render({ tasks: [task({ day: 'Monday', hour: null })] })
    expect(el.text()).toContain('Mon')
  })

  it('unschedules a task dropped onto it', () => {
    const onDrop = vi.fn()
    const el = render({ onDrop })

    dragEvent(el.$('.inbox'), 'drop', {
      types: [DRAG_TYPE, `${SPAN_TYPE}2`],
      data: { [DRAG_TYPE]: 'task-3' }
    })

    expect(onDrop).toHaveBeenCalledWith('task-3', null, null)
  })

  it('highlights itself while a task is dragged over', () => {
    const el = render()

    dragEvent(el.$('.inbox'), 'dragover', { types: [DRAG_TYPE] })
    expect(el.$('.inbox').className).toContain('inbox--over')

    dragEvent(el.$('.inbox'), 'dragleave')
    expect(el.$('.inbox').className).not.toContain('inbox--over')
  })

  it('ignores a drag carrying something else', () => {
    const onDrop = vi.fn()
    const el = render({ onDrop })

    const { prevented } = dragEvent(el.$('.inbox'), 'dragover', { types: ['text/plain'] })
    expect(prevented).toBe(false)
    expect(el.$('.inbox').className).not.toContain('inbox--over')

    dragEvent(el.$('.inbox'), 'drop', { types: ['text/plain'] })
    expect(onDrop).not.toHaveBeenCalled()
  })

  it('clears the highlight after a drop', () => {
    const el = render()
    dragEvent(el.$('.inbox'), 'dragover', { types: [DRAG_TYPE] })
    dragEvent(el.$('.inbox'), 'drop', { types: [DRAG_TYPE], data: { [DRAG_TYPE]: 'x' } })
    expect(el.$('.inbox').className).not.toContain('inbox--over')
  })

  it('passes chip callbacks through', () => {
    const onEdit = vi.fn()
    const el = render({ tasks: [task()], taskProps: { ...noopTaskProps, onEdit } })

    click(el.$('.chip__title'))
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }))
  })

  it('offers no resize handle, since an unscheduled task has no end', () => {
    const el = render({ tasks: [task()] })
    expect(el.$('.chip__resize')).toBeNull()
  })
})
