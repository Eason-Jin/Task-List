import React, { useEffect, useRef } from 'react'
import './ConfirmDialog.css'

/**
 * Confirmation for destructive actions. Uses a native <dialog> so focus
 * trapping, the backdrop and Escape come from the platform, matching TaskEditor.
 *
 * Cancel takes the initial focus: for a destructive prompt the safe option
 * should be the one that fires if someone hits Enter on reflex.
 */
const ConfirmDialog = ({ request, onConfirm, onCancel }) => {
  const dialogRef = useRef(null)
  const cancelRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (request) {
      if (!dialog.open) dialog.showModal()
      cancelRef.current?.focus()
    } else if (dialog.open) {
      dialog.close()
    }
  }, [request])

  return (
    <dialog ref={dialogRef} className="confirm" onClose={onCancel} aria-labelledby="confirm-title">
      {request && (
        <div className="confirm__inner">
          <h2 className="confirm__title" id="confirm-title">
            {request.title}
          </h2>
          <p className="confirm__message">{request.message}</p>
          <div className="confirm__actions">
            <button type="button" className="btn" ref={cancelRef} onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              className={`btn ${request.danger ? 'btn--destructive' : 'btn--primary'}`}
              onClick={onConfirm}
            >
              {request.confirmLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  )
}

export default ConfirmDialog
