# TechnoSys admin UI library

Every admin screen is built from this folder. **Pages only combine these pieces.** If something is missing, add it here first, then use it in the page.

- **Style:** soft minimal ("Cloud"). Cool white background, white cards with soft shadows, round corners, near-black buttons, and colour only for status.
- **Font:** Geist (text), Geist Mono (IDs, serial numbers).
- **Preview:** open `/ui` while signed in. It shows every piece in light and dark side by side.
- **Import:** `import { Button, Card, Badge } from '@/components/ui'`

## 1. Tokens (`tokens.css`)

All colours, sizes, spacing, corners and shadows live in `tokens.css`. Each token becomes a Tailwind class. **Never type a hex colour, a px size or a font name in a page.**

| What | Classes | When |
|---|---|---|
| Backgrounds | `bg-bg` page · `bg-surface` card · `bg-surface-soft` inside a card (inputs, table header, tab track) · `bg-surface-hover` hovered row | Back to front |
| Text | `text-ink` main · `text-ink-2` supporting · `text-ink-3` hints, IDs, placeholders | `ink-3` is never used for anything the user must read to do their job |
| Lines | `border-line` dividers · `border-line-strong` outlines | Prefer a shadow over a border for cards |
| Actions | `bg-action text-on-action` | Only through `Button`; don't paint your own buttons |
| Status | `text-success` / `bg-success-soft`, `warning`, `danger`, `info` | Only for status: pills, alerts, a hint under a number. Never decoration |
| Font size | `text-display` 32 · `text-title` 24 · `text-heading` 17 · `text-body` 14 · `text-small` 13 · `text-caption` 12 · `text-micro` 11 | Page title = `title`, card title = `heading`, tables and forms = `small` |
| Weight | `font-normal` 400 · `font-medium` 500 · `font-semibold` 600 | No bold (700) or black (900) |
| Spacing | `px-page` / `py-page-y` page · `gap-section` between blocks · `p-card` inside cards · `gap-stack` between form fields · `gap-inline` between buttons | Everything sits on a 4 px grid |
| Heights | `h-control-sm` 32 · `h-control` 40 · `h-control-lg` 48 | Buttons and inputs |
| Corners | `rounded-chip` 8 · `rounded-control` 12 inputs · `rounded-card` 20 cards and tables · `rounded-modal` 28 · `rounded-pill` buttons, badges, avatars | |
| Shadows | `shadow-card` resting · `shadow-raised` hover or toast · `shadow-overlay` modal and drawer | No glows, gradients or coloured borders |

To change the look (for example, the warm "Sand" palette), edit only `tokens.css`. Light values are under `:root`, dark under `.dark`.

## 2. Components

| Component | Use it for | Don't |
|---|---|---|
| `Page` | The frame around every page (padding, width, scrolling). `wide` for big tables and the calendar | Add your own outer padding |
| `PageHeader` | Page title, one-line subtitle, `eyebrow` (date) and `actions` on the right | Put more than 2–3 buttons in `actions` |
| `Button` | Every action. `primary` for the one main action in an area, `secondary` (default) for the rest, `ghost` for quiet actions like Cancel, `danger` for delete | Use two primaries side by side |
| `ButtonLink` | A button that goes to another page | Wrap a `Button` in a `Link` |
| `IconButton` | Icon-only actions (close, more). `label` is required | Use it for the main action of a page |
| `Field` | Label + hint + error around an input | Write your own `<label>` styling |
| `Input`, `Textarea` | Typing text. `icon={Search}` for search boxes | |
| `Select` | Picking one of a short list (status, leave type) | Build a custom dropdown for simple choices |
| `Checkbox` | Checklists and yes/no options, with the label beside it | |
| `Badge` | Status words: Pending (`warning`), Approved (`success`), Rejected (`danger`), Draft (`neutral`), Drafted by AI (`info`) | Show status by colour alone |
| `StatusDot` | A quieter status in busy tables ("Timed in") | |
| `Card`, `CardHeader` | Any white block on a page. `padded={false}` when a list or table touches the edges | Nest cards inside cards |
| `ListCard`, `ListRow` | A short list with a title and "Open →" link (overview pages) | Use it for long lists; use a table |
| `StatTile`, `StatRow` | One big number with a label; `href` makes it a link to where you act on it | Show more than 4 in a row |
| `TableContainer` … `TableCell` | Every table. `numeric` right-aligns numbers, `mono` for IDs, `TableEmptyState` when empty, `Pagination` under it | Use a plain `<table>` or a grid of cards for records |
| `Tabs` | Switching views or filters inside a page (All / Pending / Approved) | Use it as the main navigation |
| `Steps` | Numbered progress for a form in several parts (Job, Time, Team, Review) | Use it for one-screen forms |
| `Modal` | Short confirmations and small forms (2–4 fields) | Put long forms in it; use a Drawer |
| `Drawer` | Long forms and detail views (ticket thread, 201 file, new job) | |
| `EmptyState` | A page or card with nothing in it yet. Name what goes there and the next step | Write "No data" |
| `Avatar`, `AvatarStack` | A person (photo or initials); a crew on a job | |
| `useToast()` | Feedback after an action: `toast.success('Leave approved')`, `toast.error('Couldn't save. Try again.')` | Use `alert()` or build a toast inside the page |

Older names still work while pages are being moved: `KpiCard` / `KpiGrid` (→ `StatTile` / `StatRow`), `ModalDialog` (→ `Modal`), `MutedBadge` and the `StatusDot` with `status=` in `DataTable.tsx` (→ `Badge` / `StatusDot`). Remove them once no page uses them.

## 3. Writing on screens

- Sentence case everywhere ("Approve leave", not "Approve Leave"). No all-caps labels.
- Buttons start with a verb: "Approve leave", "Export to Excel".
- Plain words from the job: "Tools", "Borrowed", "Time in", not IT terms.
- Dates as "14 Nov 2026", times as "8:05 AM" (Manila time). Helpers are in `src/lib/format.ts`.
- Errors say how to fix it: "Reason must be at least 10 characters."

## 4. Checklist before a page is done

- [ ] Only pieces from this folder; no hex colours, `zinc-*`, `blue-*` or `text-[13px]` in the page.
- [ ] Checked in light and dark.
- [ ] Status always shows a word, not just a colour.
- [ ] Each file under 300 lines.
