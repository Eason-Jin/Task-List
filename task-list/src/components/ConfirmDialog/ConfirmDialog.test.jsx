import { afterEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import ConfirmDialog from './ConfirmDialog'
import { cleanup, click, mount } from '../../test/dom'

const REQUEST = {
  title: 'Delete task?',
  message: '“standup” will be removed from Mon 09:00.',
  confirmLabel: 'Delete',
  danger: true
}

const render = (props = {}) =>
  mount(<ConfirmDialog request={null} onConfirm={() => {}} onCancel={() => {}} {...props} />)

afterEach(cleanup)

describe('ConfirmDialog', () => {
  it('stays closed and empty with no request', () => {
    const el = render()
    expect(el.$('dialog').open).toBe(false)
    expect(el.$('.confirm__inner')).toBeNull()
  })

  it('opens with the title, message and confirm label of the request', () => {
    const el = render({ request: REQUEST })

    expect(el.$('dialog').open).toBe(true)
    expect(el.text()).toContain('Delete task?')
    expect(el.text()).toContain('will be removed from Mon 09:00')
    expect(el.button('Delete')).not.toBeUndefined()
  })

  it('runs the action on confirm', () => {
    const onConfirm = vi.fn()
    const el = render({ request: REQUEST, onConfirm })

    click(el.button('Delete'))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('cancels without running the action', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const el = render({ request: REQUEST, onConfirm, onCancel })

    click(el.button('Cancel'))
    expect(onCancel).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('focuses Cancel, so Enter on reflex is the safe outcome', () => {
    const el = render({ request: REQUEST })
    expect(document.activeElement).toBe(el.button('Cancel'))
  })

  it('styles the confirm button as destructive only when flagged', () => {
    const el = render({ request: REQUEST })
    expect(el.button('Delete').className).toContain('btn--destructive')

    el.render(
      <ConfirmDialog
        request={{ ...REQUEST, danger: false, confirmLabel: 'Complete all' }}
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )
    expect(el.button('Complete all').className).toContain('btn--primary')
  })

  it('closes again when the request is cleared', () => {
    const el = render({ request: REQUEST })
    expect(el.$('dialog').open).toBe(true)

    el.render(<ConfirmDialog request={null} onConfirm={() => {}} onCancel={() => {}} />)
    expect(el.$('dialog').open).toBe(false)
  })

  it('treats a native close, such as Escape, as a cancel', () => {
    const onCancel = vi.fn()
    const el = render({ request: REQUEST, onCancel })

    el.$('dialog').close()
    expect(onCancel).toHaveBeenCalled()
  })
})
