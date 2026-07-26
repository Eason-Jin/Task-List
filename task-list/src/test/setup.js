// jsdom ships <dialog> but not showModal/close, which several components rely on.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
}

if (!HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
}

// jsdom has no PointerEvent; MouseEvent carries everything these tests need.
if (typeof window.PointerEvent === 'undefined') {
  window.PointerEvent = MouseEvent
}

// Tells React that act() is expected here, silencing the "not configured to
// support act(...)" warning.
globalThis.IS_REACT_ACT_ENVIRONMENT = true
