// Day names are stored verbatim so v1 data migrates without translation.
export const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
]

export const SHORT_DAYS = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun'
}

export const DEFAULT_START_HOUR = 7
export const DEFAULT_END_HOUR = 21

export const MIN_HOUR = 0
export const MAX_HOUR = 23

/** 9 -> "09:00" */
export const formatHour = hour =>
  hour === null || hour === undefined ? 'Unscheduled' : `${String(hour).padStart(2, '0')}:00`

/** End hours are exclusive, so 9–11 reads as "09:00 – 11:00" and fills two rows. */
export const formatRange = (hour, endHour) => {
  if (hour === null || hour === undefined) return 'Unscheduled'
  if (!endHour || endHour <= hour + 1) return formatHour(hour)
  return `${formatHour(hour)} – ${formatHour(endHour)}`
}

/** Number of hour rows a task covers. */
export const spanOf = task =>
  task.hour === null ? 0 : Math.max(1, (task.endHour ?? task.hour + 1) - task.hour)

/** Inclusive list of hours between start and end. */
export const hourRange = (start, end) => {
  const hours = []
  for (let h = start; h <= end; h += 1) hours.push(h)
  return hours
}
