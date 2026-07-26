import { describe, expect, it } from 'vitest'
import { reducer, nudge, tasksOutsideRange } from './useTasks'
import { defaultState } from '../lib/storage'

const base = () => ({ ...defaultState(), undo: null })

const withTask = (task = {}) => ({
  ...base(),
  tasks: [
    {
      id: 'a',
      title: 'workshop',
      day: 'Tuesday',
      hour: 9,
      endHour: 12,
      completed: false,
      createdAt: 0,
      ...task
    }
  ]
})

describe('add', () => {
  it('defaults to a one-hour block when no end is given', () => {
    const state = reducer(base(), { type: 'add', title: 'x', day: 'Monday', hour: 9 })
    expect(state.tasks[0]).toMatchObject({ hour: 9, endHour: 10 })
  })

  it('keeps an explicit end time', () => {
    const state = reducer(base(), {
      type: 'add',
      title: 'x',
      day: 'Monday',
      hour: 9,
      endHour: 14
    })
    expect(state.tasks[0].endHour).toBe(14)
  })

  it('leaves an unscheduled task with no times at all', () => {
    const state = reducer(base(), { type: 'add', title: 'x', day: null, hour: null, endHour: 12 })
    expect(state.tasks[0]).toMatchObject({ hour: null, endHour: null })
  })

  it('never accepts an end at or before the start', () => {
    const state = reducer(base(), { type: 'add', title: 'x', day: 'Monday', hour: 9, endHour: 8 })
    expect(state.tasks[0].endHour).toBe(10)
  })
})

describe('move', () => {
  it('preserves the length of the task', () => {
    const state = reducer(withTask(), { type: 'move', id: 'a', day: 'Friday', hour: 14 })
    expect(state.tasks[0]).toMatchObject({ day: 'Friday', hour: 14, endHour: 17 })
  })

  it('drops the times when moved to the inbox', () => {
    const state = reducer(withTask(), { type: 'move', id: 'a', day: null, hour: null })
    expect(state.tasks[0]).toMatchObject({ hour: null, endHour: null })
  })

  it('gives a previously unscheduled task a one-hour block', () => {
    const state = reducer(withTask({ hour: null, endHour: null, day: null }), {
      type: 'move',
      id: 'a',
      day: 'Monday',
      hour: 8
    })
    expect(state.tasks[0]).toMatchObject({ hour: 8, endHour: 9 })
  })
})

describe('resize', () => {
  it('changes the end without touching the start', () => {
    const state = reducer(withTask(), { type: 'resize', id: 'a', endHour: 16 })
    expect(state.tasks[0]).toMatchObject({ hour: 9, endHour: 16 })
  })

  it('will not shrink a task below one hour', () => {
    const state = reducer(withTask(), { type: 'resize', id: 'a', endHour: 9 })
    expect(state.tasks[0].endHour).toBe(10)
  })

  it('will not run a task past midnight', () => {
    const state = reducer(withTask({ hour: 22, endHour: 23 }), {
      type: 'resize',
      id: 'a',
      endHour: 30
    })
    expect(state.tasks[0].endHour).toBe(24)
  })

  it('ignores an unscheduled task', () => {
    const before = withTask({ hour: null, endHour: null })
    const state = reducer(before, { type: 'resize', id: 'a', endHour: 12 })
    expect(state.tasks[0].endHour).toBeNull()
  })
})

describe('complete and restore', () => {
  it('carries the duration into the completed list and back out again', () => {
    const done = reducer(withTask(), { type: 'complete', id: 'a' })
    expect(done.tasks).toHaveLength(0)
    expect(done.completed[0]).toMatchObject({ hour: 9, endHour: 12 })

    const back = reducer(done, { type: 'restore', id: 'a' })
    expect(back.tasks[0]).toMatchObject({ day: 'Tuesday', hour: 9, endHour: 12 })
  })
})

describe('completeAll', () => {
  const twoTasks = () => ({
    ...base(),
    tasks: [
      { id: 'a', title: 'workshop', day: 'Tuesday', hour: 9, endHour: 12, completed: false },
      { id: 'b', title: 'loose end', day: null, hour: null, endHour: null, completed: false }
    ],
    completed: [{ id: 'old', title: 'earlier', day: null, hour: 8, endHour: 9, completedAt: 1 }]
  })

  it('moves every task, including unscheduled ones, into completed', () => {
    const state = reducer(twoTasks(), { type: 'completeAll' })
    expect(state.tasks).toEqual([])
    expect(state.completed.map(t => t.id)).toEqual(['a', 'b', 'old'])
  })

  it('keeps each task’s day and duration on the way over', () => {
    const state = reducer(twoTasks(), { type: 'completeAll' })
    expect(state.completed[0]).toMatchObject({ day: 'Tuesday', hour: 9, endHour: 12 })
    expect(state.completed[1]).toMatchObject({ day: null, hour: null, endHour: null })
  })

  it('is undoable', () => {
    const before = twoTasks()
    const after = reducer(before, { type: 'completeAll' })
    const restored = reducer(after, { type: 'undo' })
    expect(restored.tasks).toEqual(before.tasks)
    expect(restored.completed).toEqual(before.completed)
  })

  it('does nothing when there is nothing to complete', () => {
    const before = { ...base(), completed: [] }
    expect(reducer(before, { type: 'completeAll' })).toBe(before)
  })
})

describe('undo', () => {
  it('restores a deleted multi-hour task exactly', () => {
    const before = withTask()
    const deleted = reducer(before, { type: 'delete', id: 'a' })
    expect(deleted.tasks).toHaveLength(0)

    const restored = reducer(deleted, { type: 'undo' })
    expect(restored.tasks).toEqual(before.tasks)
  })

  it('restores everything after clear all', () => {
    const before = withTask()
    const cleared = reducer(before, { type: 'clearAll' })
    expect(reducer(cleared, { type: 'undo' }).tasks).toEqual(before.tasks)
  })
})

describe('tasksOutsideRange', () => {
  const task = (id, over) => ({
    id,
    title: id,
    day: 'Monday',
    hour: 9,
    endHour: 10,
    ...over
  })

  it('finds nothing when every task fits', () => {
    expect(tasksOutsideRange([task('a'), task('b', { hour: 20, endHour: 22 })], 7, 21)).toEqual([])
  })

  it('flags a task starting before the range', () => {
    const early = task('early', { hour: 6, endHour: 7 })
    expect(tasksOutsideRange([early], 7, 21).map(t => t.id)).toEqual(['early'])
  })

  it('flags a task whose tail runs past the last row', () => {
    // endHour is exclusive: ending at 22 occupies row 21, which still fits.
    expect(tasksOutsideRange([task('fits', { hour: 20, endHour: 22 })], 7, 21)).toEqual([])
    // Ending at 23 occupies row 22, which does not.
    expect(tasksOutsideRange([task('over', { hour: 20, endHour: 23 })], 7, 21).map(t => t.id)).toEqual(
      ['over']
    )
  })

  it('flags a long task that straddles the whole range', () => {
    const all = task('all-day', { hour: 6, endHour: 23 })
    expect(tasksOutsideRange([all], 9, 17).map(t => t.id)).toEqual(['all-day'])
  })

  it('ignores unscheduled tasks, which the range does not affect', () => {
    const inbox = task('inbox', { day: null, hour: null, endHour: null })
    const dayless = task('dayless', { day: null, hour: 3, endHour: 4 })
    expect(tasksOutsideRange([inbox, dayless], 7, 21)).toEqual([])
  })

  it('treats a task with no endHour as one hour long', () => {
    const legacy = { id: 'l', title: 'l', day: 'Monday', hour: 21 }
    expect(tasksOutsideRange([legacy], 7, 21)).toEqual([])
    expect(tasksOutsideRange([legacy], 7, 20).map(t => t.id)).toEqual(['l'])
  })

  it('orders the report by day then time, so the warning reads naturally', () => {
    const out = tasksOutsideRange(
      [
        task('fri', { day: 'Friday', hour: 6, endHour: 7 }),
        task('mon-late', { day: 'Monday', hour: 23, endHour: 24 }),
        task('mon-early', { day: 'Monday', hour: 5, endHour: 6 })
      ],
      7,
      21
    )
    expect(out.map(t => t.id)).toEqual(['mon-early', 'mon-late', 'fri'])
  })
})

describe('nudge', () => {
  const settings = { startHour: 7, endHour: 21 }

  it('moves a block by one hour', () => {
    expect(nudge({ day: 'Monday', hour: 9, endHour: 12 }, 0, 1, settings)).toEqual({
      day: 'Monday',
      hour: 10
    })
  })

  it('stops a long block before it would run off the bottom', () => {
    // A 3-hour task can start no later than 19:00 on a grid ending at 21:00.
    expect(nudge({ day: 'Monday', hour: 19, endHour: 22 }, 0, 1, settings).hour).toBe(19)
  })

  it('clamps at the first and last day', () => {
    expect(nudge({ day: 'Monday', hour: 9, endHour: 10 }, -1, 0, settings).day).toBe('Monday')
    expect(nudge({ day: 'Sunday', hour: 9, endHour: 10 }, 1, 0, settings).day).toBe('Sunday')
  })
})
