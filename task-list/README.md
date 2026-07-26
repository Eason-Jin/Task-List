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
contrast, is the last *row* of the grid, which is why `rangeCovering` compares against
`endHour - 1`.

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
and `--lane` / `--lanes` split the column width so overlapping tasks sit side by side.

Both pointer gestures (sweep-to-select a range, drag-the-edge-to-resize) work by reading
which background cell the pointer is over rather than doing pixel maths, so `.grid--busy`
sets `pointer-events: none` on task blocks while a gesture or an HTML5 drag is in flight.
