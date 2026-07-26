# Task List

A weekly planner that runs entirely in your browser. No account, no server — every task is
saved to your browser's local storage, so closing the tab and coming back later keeps
everything where you left it.

## How to use

You need [Node.js](https://nodejs.org/) installed.

```bash
cd task-list
npm install
npm run dev
```

Then open the URL it prints (http://localhost:5173).

To produce a static build you can host anywhere:

```bash
npm run build      # outputs to task-list/dist
npm run preview    # check the built version locally
```

## Features

- **Weekly grid**, Monday to Sunday, over a configurable range of hours.
- **Start and end times** — a task can run for as long as you need and is drawn as a block
  covering every hour it occupies.
- **Overlapping tasks sit side by side**, and the day they're on widens so each one stays
  wide enough to read. Only that day grows; the rest of the week keeps its width, and the
  grid scrolls sideways if the week no longer fits.
- **Drag down the calendar** to block out a range: press in the hour you want to start,
  drag to the hour you want to finish, and the composer opens pre-filled with that slot.
  A single click picks one hour.
- **Drag a task's bottom edge** to change when it finishes.
- **Add tasks** from the composer, with `from` and `to` selects. Day and times are all
  optional.
- **Unscheduled strip** for anything without a day or time, so nothing gets lost.
- **Drag and drop** a task between cells to reschedule it — its length comes along. From
  the keyboard, focus a task and press `Ctrl`/`Cmd` + arrow keys to move it, or
  `Shift` + up/down to lengthen and shorten it.
- **Edit** a task by clicking its title (or pressing `Enter` when focused) to rename or
  reschedule it.
- **Tick to complete** — a checked task moves to the Completed panel immediately.
  Unticking it there sends it back to its slot on the grid.
- **Complete all** ticks off everything on the schedule at once, including unscheduled
  tasks.
- **Confirmation before anything destructive** — deleting a task, Complete all, Clear all
  and Clear completed each ask first, naming what will happen. Cancel is focused by
  default, so hitting Enter on reflex is the safe outcome.
- **Undo** as a second net: deleting a task, Complete all, Clear all and Clear completed
  all offer an Undo in the toast afterwards.
- **Settings** (top right) holds the **light / dark / system** theme and the **hours shown**
  on the grid. Both are remembered between visits.
- **Narrowing the day** warns you if it would hide a task, naming each one with its day and
  time range. Nothing is deleted — widening the range brings them straight back.
- **Responsive** — the grid scrolls on its own below ~900px and the Completed panel moves
  underneath it.

### Keyboard

| Key | Action |
| --- | --- |
| `Enter` (composer) | Add the task |
| `Escape` (composer) | Clear the input |
| `Enter` (focused task) | Open the editor |
| `Delete` / `Backspace` (focused task) | Delete it (undoable) |
| `Ctrl`/`Cmd` + arrows (focused task) | Move it one cell |
| `Shift` + up/down (focused task) | Shorten / lengthen it by an hour |

## Upgrading from the old version

The first time you open this version, tasks saved by the previous one are imported
automatically — you do not need to do anything. The original data is copied to a
`tasklist.v1.backup` key in local storage before anything is overwritten.

Tasks that the old version saved without a time were stored but never displayed anywhere.
Those now appear in the **Unscheduled** strip below the grid, so you may see a few tasks
you had forgotten about.

The old version had no concept of how long a task took, so imported tasks — and any you
created before end times were added — become one-hour blocks. Stretch them by dragging the
bottom edge.

For build details and the data format, see [`task-list/README.md`](task-list/README.md).

## Credit

Made by Eason Jin.
