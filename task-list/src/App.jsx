import React, { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import TimeTable from './components/TimeTable/TimeTable'
import Composer from './components/Composer/Composer'
import Inbox from './components/Inbox/Inbox'
import CompletedPanel from './components/CompletedPanel/CompletedPanel'
import TaskEditor from './components/TaskEditor/TaskEditor'
import Toast from './components/Toast/Toast'
import ThemeToggle from './components/ThemeToggle/ThemeToggle'
import { useTasks, nudge } from './hooks/useTasks'
import { SHORT_DAYS, formatRange } from './lib/constants'

function App() {
  const { state, dispatch, layout, inbox, toast, announce, undo, dismissToast } = useTasks()
  const [editing, setEditing] = useState(null)
  const [composerDefaults, setComposerDefaults] = useState(null)

  const { theme } = state.settings

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
  }, [theme])

  const handleAdd = useCallback(
    ({ title, day, hour, endHour }) => {
      dispatch({ type: 'add', title, day, hour, endHour })
      announce(
        day && hour !== null
          ? `Added to ${SHORT_DAYS[day]} ${formatRange(hour, endHour)}`
          : 'Added to Unscheduled'
      )
    },
    [dispatch, announce]
  )

  const handleDrop = useCallback(
    (id, day, hour) => {
      dispatch({ type: 'move', id, day, hour })
    },
    [dispatch]
  )

  const handleResize = useCallback(
    (id, endHour) => {
      dispatch({ type: 'resize', id, endHour })
    },
    [dispatch]
  )

  /** Sweeping a range of cells pre-fills the composer rather than guessing a title. */
  const handleCreate = useCallback((day, hour, endHour) => {
    setComposerDefaults({ day, hour, endHour, at: Date.now() })
  }, [])

  const handleNudge = useCallback(
    (task, dx, dy) => {
      const next = nudge(task, dx, dy, state.settings)
      dispatch({ type: 'move', id: task.id, ...next })
      const length = (task.endHour ?? task.hour + 1) - task.hour
      announce(
        `Moved to ${SHORT_DAYS[next.day]} ${formatRange(next.hour, next.hour + (length || 1))}`
      )
    },
    [dispatch, announce, state.settings]
  )

  const taskProps = useMemo(
    () => ({
      onComplete: task => {
        dispatch({ type: 'complete', id: task.id })
        announce('Completed')
      },
      onDelete: task => dispatch({ type: 'delete', id: task.id }),
      onEdit: task => setEditing(task),
      onNudge: handleNudge,
      onResize: handleResize
    }),
    [dispatch, announce, handleNudge, handleResize]
  )

  const total = state.tasks.length

  return (
    <div className="app">
      <header className="app__bar">
        <div className="app__brand">
          <h1 className="app__name">Task List</h1>
          <p className="app__sub">
            {total === 0 ? 'Nothing scheduled' : `${total} task${total === 1 ? '' : 's'} planned`}
            {state.completed.length > 0 && ` · ${state.completed.length} done`}
          </p>
        </div>
        <ThemeToggle
          theme={theme}
          onChange={value => dispatch({ type: 'settings', settings: { theme: value } })}
        />
      </header>

      <main className="app__main">
        <div className="app__plan">
          <Composer
            settings={state.settings}
            defaults={composerDefaults}
            taskCount={total}
            onAdd={handleAdd}
            onClearAll={() => dispatch({ type: 'clearAll' })}
          />
          <TimeTable
            settings={state.settings}
            layout={layout}
            onDrop={handleDrop}
            onResize={handleResize}
            onCreate={handleCreate}
            taskProps={taskProps}
          />
          <Inbox tasks={inbox} onDrop={handleDrop} taskProps={taskProps} />
        </div>

        <aside className="app__side">
          <CompletedPanel
            tasks={state.completed}
            onRestore={task => {
              dispatch({ type: 'restore', id: task.id })
              announce('Moved back to the schedule')
            }}
            onDelete={task => dispatch({ type: 'delete', id: task.id })}
            onClear={() => dispatch({ type: 'clearCompleted' })}
          />
        </aside>
      </main>

      <TaskEditor
        task={editing}
        settings={state.settings}
        onClose={() => setEditing(null)}
        onSave={({ id, title, day, hour, endHour }) => {
          dispatch({ type: 'edit', id, title, day, hour, endHour })
          setEditing(null)
          announce('Task updated')
        }}
      />

      <Toast toast={toast} onUndo={undo} onDismiss={dismissToast} />
    </div>
  )
}

export default App
