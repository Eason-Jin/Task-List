import { afterEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import Toast from './Toast'
import { cleanup, click, mount } from '../../test/dom'
import { act } from 'react'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const render = (props = {}) =>
  mount(<Toast toast={null} onUndo={() => {}} onDismiss={() => {}} {...props} />)

describe('Toast', () => {
  it('keeps the live region mounted while empty', () => {
    // Screen readers ignore a region that appears at the same time as its text.
    const el = render()
    expect(el.$('[role="status"]')).not.toBeNull()
    expect(el.$('.toast')).toBeNull()
  })

  it('shows a message', () => {
    const el = render({ toast: { message: 'Completed', undoable: false, at: 1 } })
    expect(el.text()).toContain('Completed')
    expect(el.button('Undo')).toBeUndefined()
  })

  it('offers Undo only when the action can be undone', () => {
    const onUndo = vi.fn()
    const el = render({ toast: { message: 'Task deleted', undoable: true, at: 1 }, onUndo })

    click(el.button('Undo'))
    expect(onUndo).toHaveBeenCalled()
  })

  it('dismisses on the close button', () => {
    const onDismiss = vi.fn()
    const el = render({ toast: { message: 'Saved', undoable: false, at: 1 }, onDismiss })

    click(el.$('.toast__close'))
    expect(onDismiss).toHaveBeenCalled()
  })

  it('dismisses itself after six seconds', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render({ toast: { message: 'Saved', undoable: false, at: 1 }, onDismiss })

    act(() => vi.advanceTimersByTime(5999))
    expect(onDismiss).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(1))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('restarts the countdown when a new message replaces an old one', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    const el = render({ toast: { message: 'First', undoable: false, at: 1 }, onDismiss })

    act(() => vi.advanceTimersByTime(4000))
    el.render(
      <Toast toast={{ message: 'Second', undoable: false, at: 2 }} onUndo={() => {}} onDismiss={onDismiss} />
    )

    act(() => vi.advanceTimersByTime(4000))
    expect(onDismiss).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(2000))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('sets no timer at all when there is nothing to dismiss', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render({ toast: null, onDismiss })

    act(() => vi.advanceTimersByTime(20000))
    expect(onDismiss).not.toHaveBeenCalled()
  })
})
