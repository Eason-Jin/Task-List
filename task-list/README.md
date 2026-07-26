# Task List — app

The React app itself. See the [repository README](../README.md) for what it does and how
to use it; this file covers the build only.

## Commands

Run these from this directory (`task-list/`).

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies (once) |
| `npm run dev` | Dev server at http://localhost:5173 (`npm start` is an alias) |
| `npm run build` | Static production build into `dist/` |
| `npm run preview` | Serve the built `dist/` locally to check it |
| `npm test` | Run the test suite once |

## Layout

```
index.html            Vite entry point
vite.config.js        base: './' so dist/ works from any path
src/
  main.jsx            React root
  App.jsx             Layout shell, wiring, theme
  lib/
    constants.js      Days, hour helpers
    storage.js        localStorage read/write + v1 -> v2 migration
  hooks/
    useTasks.js       Reducer, undo snapshots, per-day lane layout
  styles/
    tokens.css        Every design token; the only :root in the codebase
    global.css        Reset, base elements, .btn / .field primitives
  components/         One folder per component, each with its own CSS
```

## Data

Everything lives in `localStorage` under a single key, `tasklist.v2`:

```js
{
  version: 3,
  settings: { startHour, endHour, theme },
  tasks:     [{ id, title, day, hour, endHour, completed, createdAt }],
  completed: [{ id, title, day, hour, endHour, completedAt }]
}
```

`day` is a full English name (`'Monday'`) or `null`; `hour` is a 0–23 integer or `null`.
A `null` in either field means the task is unscheduled and shows in the Inbox.

`endHour` is **exclusive** and always at least `hour + 1`, so 9→11 covers the 09:00 and
10:00 rows. It may be 24 for a task in the final slot of the day. `settings.endHour`, by
contrast, is the last *row* of the grid — hence the `endHour - 1` comparisons in
`rangeCovering` and `tasksOutsideRange`.

`settings.startHour` / `endHour` are edited in `SettingsDialog`, which holds every field as
a draft and commits only on Save, so Cancel is a true undo. Save is **disabled** while
`tasksOutsideRange` (in `useTasks.js`) reports anything that would not fit, which is why
`loadState` no longer widens the stored range to cover every task — the invariant is
enforced at the point of change instead. `migrateV1` still widens, since v1 data predates
the setting and must not be hidden behind a range the user never chose.

The key name still says `v2` because schema 3 only added `endHour`. Every read path fills
it in (one hour) when it is missing, so installs written by schema 2 upgrade in place
without another migration and backup cycle.

### Migration from v1

On first load, `loadState()` detects the old `tasks` / `completedTasks` keys and converts
them. Before writing anything it copies the originals to `tasklist.v1.backup`, so the
previous data is recoverable. Tasks the old app saved with an empty time — which it then
never rendered anywhere — surface in the Unscheduled strip rather than staying invisible.

Migration is the one place a bug would destroy real data, so it is covered by
`src/lib/storage.test.js`. Run `npm test` after touching `storage.js`.

## Grid layout

`TimeTable` is one CSS grid: row 1 is the header, then one row per hour. Background cells
and task blocks are placed into the same grid explicitly, which is what lets a task span
rows. Row height is fixed (`--row-h`) because spanning tasks cannot let rows grow to fit
their content.

`useTasks` assigns each task a **lane** per day — the first lane free at its start hour —
and `--lane` / `--lanes` tile the column so overlapping tasks sit side by side.

Splitting a fixed-width column between lanes does not work: a chip spends ~65px on fixed
chrome (3px accent border, ~10px padding, 14px checkbox, 18px delete button, gaps) before
any text, so three lanes in a 132px column leave the title a negative width. Instead each
day column is sized to hold *its own* lane count at a readable minimum —
`max(MIN_DAY, lanes * MIN_LANE)` in `columnTemplate` — so only a day that actually has
overlaps grows, and the grid scrolls horizontally when the week no longer fits.

`grid-template-columns` is therefore set **inline** from the layout, which is why the
`@media (max-width: 900px)` block only narrows `--time-col`: anything it declared for
`grid-template-columns` would lose to the inline style.

Titles wrap only at word boundaries (`overflow-wrap: normal`), so a word is never broken
across lines. A single word too long for its lane is clipped by the line clamp instead, and
the chip carries a `title` tooltip with the full text.

Both pointer gestures (sweep-to-select a range, drag-the-edge-to-resize) work by reading
which background cell the pointer is over rather than doing pixel maths, so `.grid--busy`
sets `pointer-events: none` on task blocks while a gesture or an HTML5 drag is in flight.

The resize strip sits *inside* the draggable chip, so pressing it would otherwise begin a
native drag and move the task rather than stretch it. `TaskChip` sets a ref on the handle's
`pointerdown` and `handleDragStart` refuses the drag while it is set — a ref, not state,
because the guard has to be visible synchronously before the browser commits to the drag.
`TaskChip.test.jsx` drives real DOM events over this, since it has regressed twice.
That class is set on `dragenter`, not `dragstart`, so it also covers a task dragged in from
the Inbox.

## Drop preview

Dropping preserves a task's length, so the preview highlights every hour the block would
occupy, not just the hovered cell. `dataTransfer` *values* cannot be read during `dragover`
— only the list of type names — so `TaskChip` encodes the length in a second type,
`text/task-span-<n>`, which `spanFromTypes` parses back out. This keeps the preview
stateless and works regardless of which component the drag started in.

The outline is drawn edge by edge (`--over-first` / `--over-last`) so a multi-hour range
reads as one block rather than a stack of separate boxes. `dragleave` is handled on the grid
container and checks `relatedTarget`, because a per-cell `dragleave` fires *after* the next
cell's `dragover` and makes the highlight flicker.
