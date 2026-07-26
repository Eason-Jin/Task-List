import React from 'react'
import './CompletedPanel.css'
import { SHORT_DAYS, formatRange } from '../../lib/constants'

const describe = task => {
  const parts = []
  if (task.day) parts.push(SHORT_DAYS[task.day])
  if (task.hour !== null) parts.push(formatRange(task.hour, task.endHour))
  return parts.join(' · ')
}

/**
 * Unchecking sends a task back to the grid, so completing something is no longer
 * a one-way trip through the old "check, then also press X" flow.
 */
const CompletedPanel = ({ tasks, onRestore, onDelete, onClear }) => (
  <section className="done" aria-label="Completed tasks">
    <header className="done__head">
      <h2 className="done__title">
        Completed
        <span className="done__count">{tasks.length}</span>
      </h2>
      <button
        type="button"
        className="btn btn--ghost btn--danger"
        onClick={onClear}
        disabled={tasks.length === 0}
      >
        Clear
      </button>
    </header>

    {tasks.length === 0 ? (
      <p className="done__empty">
        Nothing done yet. Tick a task off the grid and it will land here.
      </p>
    ) : (
      <ul className="done__list">
        {tasks.map(task => (
          <li className="done__item" key={task.id}>
            <input
              type="checkbox"
              checked
              onChange={() => onRestore(task)}
              aria-label={`Move "${task.title}" back to the schedule`}
            />
            <span className="done__text">
              <span className="done__label">{task.title}</span>
              {describe(task) && <span className="done__meta">{describe(task)}</span>}
            </span>
            <button
              type="button"
              className="done__delete"
              onClick={() => onDelete(task)}
              aria-label={`Delete "${task.title}" permanently`}
              title="Delete"
            >
              <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                <path
                  d="M3 3l10 10M13 3L3 13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    )}
  </section>
)

export default CompletedPanel
