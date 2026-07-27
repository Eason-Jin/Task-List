import React, { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import TimeTable from './components/TimeTable/TimeTable'
import Composer from './components/Composer/Composer'
import Inbox from './components/Inbox/Inbox'
import CompletedPanel from './components/CompletedPanel/CompletedPanel'
import TaskEditor from './components/TaskEditor/TaskEditor'
import ConfirmDialog from './components/ConfirmDialog/ConfirmDialog'
import SettingsDialog from './components/SettingsDialog/SettingsDialog'
import Toast from './components/Toast/Toast'
import { useTasks, nudge } from './hooks/useTasks'
import { SHORT_DAYS, formatRange } from './lib/constants'

function App() {
  const { state, dispatch, layout, inbox, toast, announce, undo, dismissToast } = useTasks()
  const [editing, setEditing] = useState(null)
  const [composerDefaults, setComposerDefaults] = useState(null)
  const [confirming, setConfirming] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mobileTab, setMobileTab] = useState('schedule')

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

  const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

  const saveSettings = useCallback(
    settings => {
      dispatch({ type: 'settings', settings })
      setSettingsOpen(false)
      announce('Settings saved')
    },
    [dispatch, announce]
  )

  /**
   * Destructive actions ask first. The undo toast is still the safety net for
   * anything that slips through — this just stops the accidental click.
   */
  const askDelete = useCallback(
    task => {
      const where =
        task.day && task.hour !== null
          ? ` from ${SHORT_DAYS[task.day]} ${formatRange(task.hour, task.endHour)}`
          : ''
      setConfirming({
        title: 'Delete task?',
        message: `“${task.title}” will be removed${where}.`,
        confirmLabel: 'Delete',
        danger: true,
        run: () => dispatch({ type: 'delete', id: task.id })
      })
    },
    [dispatch]
  )

  const askCompleteAll = useCallback(() => {
    setConfirming({
      title: 'Complete all tasks?',
      message: `${plural(state.tasks.length, 'task')} will move to the completed list.`,
      confirmLabel: 'Complete all',
      danger: false,
      run: () => dispatch({ type: 'completeAll' })
    })
  }, [dispatch, state.tasks.length])

  const askClearAll = useCallback(() => {
    setConfirming({
      title: 'Clear all tasks?',
      message: `${plural(state.tasks.length, 'task')} will be removed from the schedule.`,
      confirmLabel: 'Clear all',
      danger: true,
      run: () => dispatch({ type: 'clearAll' })
    })
  }, [dispatch, state.tasks.length])

  const askClearCompleted = useCallback(() => {
    setConfirming({
      title: 'Clear completed?',
      message: `${plural(state.completed.length, 'completed task')} will be removed for good.`,
      confirmLabel: 'Clear',
      danger: true,
      run: () => dispatch({ type: 'clearCompleted' })
    })
  }, [dispatch, state.completed.length])

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
      onDelete: askDelete,
      onEdit: task => setEditing(task),
      onNudge: handleNudge,
      onResize: handleResize
    }),
    [dispatch, announce, askDelete, handleNudge, handleResize]
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
        <button
          type="button"
          className="btn app__settings"
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
        >
          <span aria-hidden="true">⚙</span>
          <span className="app__settings-text">Settings</span>
        </button>
      </header>

      <main className={`app__main app__main--${mobileTab}`}>
        <div className="app__plan">
          <Composer
            settings={state.settings}
            defaults={composerDefaults}
            taskCount={total}
            onAdd={handleAdd}
            onCompleteAll={askCompleteAll}
            onClearAll={askClearAll}
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
            onDelete={askDelete}
            onClear={askClearCompleted}
          />
        </aside>
      </main>

      {/* Below 900px the header is hidden and each section takes the full
          space between the top of the screen and this bar instead of all
          three competing for a slice of the viewport. Settings opens the
          same dialog the desktop gear button uses rather than switching
          panels, since it's a one-off action, not a view to stay on. */}
      <nav className="tabbar" aria-label="Sections">
        <button
          type="button"
          className={`tabbar__btn${mobileTab === 'schedule' ? ' tabbar__btn--active' : ''}`}
          aria-current={mobileTab === 'schedule' ? 'page' : undefined}
          onClick={() => setMobileTab('schedule')}
        >
          <span aria-hidden="true">📅</span>
          <span>Schedule</span>
        </button>
        <button
          type="button"
          className={`tabbar__btn${mobileTab === 'tasks' ? ' tabbar__btn--active' : ''}`}
          aria-current={mobileTab === 'tasks' ? 'page' : undefined}
          onClick={() => setMobileTab('tasks')}
        >
          <span aria-hidden="true">📋</span>
          <span>
            Tasks{inbox.length + state.completed.length > 0
              ? ` (${inbox.length + state.completed.length})`
              : ''}
          </span>
        </button>
        <button
          type="button"
          className={`tabbar__btn${settingsOpen ? ' tabbar__btn--active' : ''}`}
          aria-current={settingsOpen ? 'page' : undefined}
          onClick={() => setSettingsOpen(true)}
        >
          <span aria-hidden="true">⚙</span>
          <span>Settings</span>
        </button>
      </nav>

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

      <SettingsDialog
        open={settingsOpen}
        settings={state.settings}
        tasks={state.tasks}
        onSave={saveSettings}
        onClose={() => setSettingsOpen(false)}
      />

      <ConfirmDialog
        request={confirming}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          confirming?.run()
          setConfirming(null)
        }}
      />

      <Toast toast={toast} onUndo={undo} onDismiss={dismissToast} />
    </div>
  )
}

export default App
