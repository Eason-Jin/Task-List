import React, { useState } from 'react'
import './Inbox.css'
import TaskChip, { DRAG_TYPE } from '../TaskChip/TaskChip'

/**
 * Holding pen for tasks without both a day and a time — including the ones the
 * v1 app saved with an empty time and then never rendered anywhere.
 */
const Inbox = ({ tasks, onDrop, taskProps }) => {
  const [over, setOver] = useState(false)

  const handleDragOver = event => {
    if (!event.dataTransfer.types.includes(DRAG_TYPE)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setOver(true)
  }

  const handleDrop = event => {
    const id = event.dataTransfer.getData(DRAG_TYPE)
    if (!id) return
    event.preventDefault()
    setOver(false)
    onDrop(id, null, null)
  }

  return (
    <section
      className={`inbox${over ? ' inbox--over' : ''}`}
      aria-label="Unscheduled tasks"
      onDragOver={handleDragOver}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
    >
      <h2 className="inbox__title">
        Unscheduled
        <span className="inbox__count">{tasks.length}</span>
      </h2>
      {tasks.length === 0 ? (
        <p className="inbox__empty">Drop a task here to unschedule it.</p>
      ) : (
        <div className="inbox__list">
          {tasks.map(task => (
            <TaskChip key={task.id} task={task} showMeta {...taskProps} />
          ))}
        </div>
      )}
    </section>
  )
}

export default Inbox
