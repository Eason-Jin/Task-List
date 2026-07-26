import React, { useEffect } from 'react'
import './Toast.css'

const TIMEOUT = 6000

/**
 * Always mounted so the live region exists before a message arrives — screen
 * readers ignore regions that appear at the same time as their content.
 */
const Toast = ({ toast, onUndo, onDismiss }) => {
  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(onDismiss, TIMEOUT)
    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  return (
    <div className="toast-host" role="status" aria-live="polite">
      {toast && (
        <div className="toast" key={toast.at}>
          <span className="toast__message">{toast.message}</span>
          {toast.undoable && (
            <button type="button" className="toast__action" onClick={onUndo}>
              Undo
            </button>
          )}
          <button
            type="button"
            className="toast__close"
            onClick={onDismiss}
            aria-label="Dismiss notification"
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
        </div>
      )}
    </div>
  )
}

export default Toast
