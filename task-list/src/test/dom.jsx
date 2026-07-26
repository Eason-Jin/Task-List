import { act } from 'react'
import { createRoot } from 'react-dom/client'

/**
 * Minimal mount-and-drive helpers. @testing-library would be the usual choice,
 * but the app only needs a few real DOM events and this keeps the dependency
 * list at react + react-dom.
 *
 * Everything goes through act() rather than flushSync: drag events are dispatched
 * at React's *continuous* priority, and those updates do not flush inside
 * flushSync — only act() drains every priority.
 */
const mounted = []

export const mount = element => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(element))

  const handle = {
    container,
    render: next => act(() => root.render(next)),
    unmount: () => {
      act(() => root.unmount())
      container.remove()
    },
    $: selector => container.querySelector(selector),
    $$: selector => Array.from(container.querySelectorAll(selector)),
    /**
     * Find a button by its label. Several dialogs are always mounted and reuse
     * labels like Save and Cancel, so pass a `scope` selector to disambiguate.
     */
    button: (text, scope) => {
      const root = scope ? container.querySelector(scope) : container
      return Array.from(root?.querySelectorAll('button') ?? []).find(
        node => node.textContent.trim() === text
      )
    },
    text: () => container.textContent
  }

  mounted.push(handle)
  return handle
}

/** Tear down anything still mounted; call from afterEach. */
export const cleanup = () => {
  while (mounted.length > 0) {
    const handle = mounted.pop()
    try {
      handle.unmount()
    } catch {
      // Already gone — nothing to do.
    }
  }
}

const fire = (node, event) => {
  let notCancelled = true
  act(() => {
    notCancelled = node.dispatchEvent(event)
  })
  return { prevented: !notCancelled, event }
}

const mouse = (node, type, init = {}) =>
  fire(node, new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, ...init }))

export const click = node => mouse(node, 'click')

export const dblclick = node => mouse(node, 'dblclick')

export const pointerDown = (node, init) => mouse(node, 'pointerdown', init).prevented

/**
 * React has no listener for `pointerenter` — it synthesises onPointerEnter from
 * `pointerover`, and only fires it when relatedTarget is outside the tree. So
 * dispatch pointerover with no relatedTarget.
 */
export const pointerEnter = node => mouse(node, 'pointerover', { relatedTarget: null })

export const windowPointerUp = () =>
  fire(window, new MouseEvent('pointerup', { bubbles: true }))

export const windowPointerCancel = () =>
  fire(window, new MouseEvent('pointercancel', { bubbles: true }))

/** Checkboxes: React derives onChange from the click, not from a change event. */
export const toggle = node => click(node)

/**
 * React installs its own `value` property on controlled inputs to dedupe change
 * events, so assigning `node.value` directly is invisible to it. Going through
 * the prototype setter bypasses that shim and the change is seen.
 */
const setValue = (node, value) => {
  const proto =
    node instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : node instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, value)
}

export const change = (node, value) => {
  setValue(node, value)
  return fire(node, new Event('change', { bubbles: true }))
}

export const type = (node, value) => {
  setValue(node, value)
  return fire(node, new Event('input', { bubbles: true }))
}

export const keyDown = (node, key, init = {}) =>
  fire(node, new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, ...init }))

export const submit = node => fire(node, new Event('submit', { bubbles: true, cancelable: true }))

/**
 * jsdom has no DragEvent, so stand one up with the parts React reads. `types`
 * feeds the dragover handlers; `data` is what getData returns on drop.
 */
export const dragEvent = (node, eventType, { types = [], data = {}, relatedTarget } = {}) => {
  const event = new Event(eventType, { bubbles: true, cancelable: true })
  event.dataTransfer = {
    types,
    setData: (key, value) => {
      data[key] = value
    },
    getData: key => data[key] ?? '',
    effectAllowed: '',
    dropEffect: ''
  }
  if (relatedTarget !== undefined) {
    Object.defineProperty(event, 'relatedTarget', { value: relatedTarget })
  }
  const { prevented } = fire(node, event)
  return { event, prevented, data }
}
