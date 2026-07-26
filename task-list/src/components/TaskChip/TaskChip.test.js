import { describe, expect, it } from 'vitest'
import { DRAG_TYPE, SPAN_TYPE, spanFromTypes } from './TaskChip'

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
