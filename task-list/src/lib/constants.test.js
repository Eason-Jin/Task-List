import { describe, expect, it } from 'vitest'
import { DAYS, SHORT_DAYS, formatHour, formatRange, hourRange, spanOf } from './constants'

describe('days', () => {
  it('runs Monday to Sunday with a short name for each', () => {
    expect(DAYS).toHaveLength(7)
    expect(DAYS[0]).toBe('Monday')
    expect(DAYS[6]).toBe('Sunday')
    DAYS.forEach(day => expect(SHORT_DAYS[day]).toHaveLength(3))
  })
})

describe('formatHour', () => {
  it('pads to two digits', () => {
    expect(formatHour(0)).toBe('00:00')
    expect(formatHour(9)).toBe('09:00')
    expect(formatHour(23)).toBe('23:00')
  })

  it('reads as unscheduled with no hour', () => {
    expect(formatHour(null)).toBe('Unscheduled')
    expect(formatHour(undefined)).toBe('Unscheduled')
  })
})

describe('formatRange', () => {
  it('shows both ends of a multi-hour task', () => {
    expect(formatRange(9, 12)).toBe('09:00 – 12:00')
  })

  it('shows just the start for a single hour', () => {
    expect(formatRange(9, 10)).toBe('09:00')
  })

  it('shows just the start when the end is missing or nonsensical', () => {
    expect(formatRange(9, null)).toBe('09:00')
    expect(formatRange(9, undefined)).toBe('09:00')
    expect(formatRange(9, 9)).toBe('09:00')
    expect(formatRange(9, 8)).toBe('09:00')
  })

  it('reads as unscheduled with no start', () => {
    expect(formatRange(null, 12)).toBe('Unscheduled')
    expect(formatRange(undefined, undefined)).toBe('Unscheduled')
  })
})

describe('spanOf', () => {
  it('counts the hours a task covers', () => {
    expect(spanOf({ hour: 9, endHour: 12 })).toBe(3)
    expect(spanOf({ hour: 9, endHour: 10 })).toBe(1)
  })

  it('treats a missing end as one hour', () => {
    expect(spanOf({ hour: 9 })).toBe(1)
    expect(spanOf({ hour: 9, endHour: null })).toBe(1)
  })

  it('never returns less than an hour for a scheduled task', () => {
    expect(spanOf({ hour: 9, endHour: 8 })).toBe(1)
  })

  it('is zero for an unscheduled task', () => {
    expect(spanOf({ hour: null, endHour: null })).toBe(0)
  })
})

describe('hourRange', () => {
  it('is inclusive at both ends', () => {
    expect(hourRange(9, 12)).toEqual([9, 10, 11, 12])
    expect(hourRange(9, 9)).toEqual([9])
  })

  it('is empty when the end precedes the start', () => {
    expect(hourRange(12, 9)).toEqual([])
  })
})
