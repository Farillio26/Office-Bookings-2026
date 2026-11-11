# Office Bookings

Farillio desk booking system — a perpetual, year-on-year booking calendar with
attendance dashboards, an incentives tracker and a raffle spinner.

## Pages

| Page | What it does |
| --- | --- |
| `index.html` | Desk booking calendar, attendance dashboard, department tracking, user management |
| `incentives.html` | Incentive tracker (consecutive-week streaks), raffle, and the winners log |
| `raffle.html` | Standalone raffle spinner |

Booking data lives in Firebase Firestore (`bookingData/main`) and syncs live
across everyone with the page open.

## Perpetual years

The system is not tied to any single year.

- A **year picker** sits at the top of each page. The year you choose is
  carried across all three pages as you move between them.
- It always opens on the **current year and current month**. The chosen year is
  kept in `sessionStorage` rather than `localStorage` precisely so that a fresh
  open lands on today, instead of wherever somebody last browsed to.
- The picker runs from **2026** (when records start) to **five years ahead of
  today**, so the range rolls forward on its own and never needs editing.
- **UK bank holidays are calculated** for whichever year you are viewing —
  including Easter and the "substitute day" rule when Christmas, Boxing Day or
  New Year's Day fall on a weekend. Nothing needs updating each January.
- Bookings are stored against full dates (`YYYY-MM-DD_desk3`), so every year's
  data sits side by side and earlier years stay viewable.

### Adding a one-off bank holiday

Some bank holidays can't be calculated — royal events, jubilees, state
funerals. Add them to `BANK_HOLIDAY_OVERRIDES` in
[`js/calendar-core.js`](js/calendar-core.js):

```js
export const BANK_HOLIDAY_OVERRIDES = {
    2027: ['2027-06-04'],
};
```

`BANK_HOLIDAY_EXCLUSIONS` works the same way if a normally-calculated date
should *not* count as a holiday that year.

### Naming a bank holiday

Most bank holidays show as 🏖️ **Bank Holiday**. Christmas and New Year
show their own name and icon instead — 🎄 **Christmas** and 🎆 **New Year**.

The name is attached to the *holiday*, not to a fixed date, so it follows the
substitute day: when Christmas Day falls on a Saturday the holiday moves to the
following Monday, and that Monday is the one labelled 🎄 Christmas.

To name another one, add it to `BANK_HOLIDAY_LABELS` in
[`js/calendar-core.js`](js/calendar-core.js) and pass its key as the second
argument to `add()` where that holiday is built:

```js
export const BANK_HOLIDAY_LABELS = {
    newYear:   { name: 'New Year',   icon: '🎆' },
    christmas: { name: 'Christmas',  icon: '🎄' },
    boxingDay: { name: 'Boxing Day', icon: '🎁' }   // then: add(..., 'boxingDay')
};
```

Anything without a key falls back to `DEFAULT_BANK_HOLIDAY_LABEL`.

### Changing how far ahead people can book

Edit `YEARS_AHEAD` in `js/calendar-core.js` (currently 5).

## Raffle winners log and cooldown

The **Winners Log** tab on the Incentives page records who won what, and when.

- After a draw, the result shows a **Save to winners log** button. A win is only
  recorded when that is clicked, so practice spins don't end up in the record.
- Anyone who has won in the **last 3 months** still appears in the eligible list,
  but greyed out and struck through with a 🔒 badge showing when they are back
  in. The wheel is built only from the names that aren't blocked, so it cannot
  land on them.
- If everyone in the chosen period is on cooldown, the draw is held and offers an
  **Ignore the cooldown for this draw** override.
- **Add a past win** lets you enter winners from before the log existed, so the
  cooldown applies from day one. The draw runs fortnightly, so the last six or so
  cover the three-month window.
- Entries can be removed with the ✕ on any row, which also lifts that cooldown.

The window is `COOLDOWN_MONTHS` in [`js/winners.js`](js/winners.js).

The log is stored in its own Firestore document, `bookingData/winners`. This
matters: the booking page saves `bookingData/main` with a whole-document
overwrite, so anything kept alongside `users` and `bookings` would be destroyed
the next time somebody booked a desk.

## Look and feel

Colour comes from the **Farillio Design System** (`Farillio Design System.zip`
-> `colors_and_type.css`). Every brand, neutral, complimentary and semantic
token is mirrored in [`css/farillio.css`](css/farillio.css), which all three
pages link. That file also keeps aliases for the names the pages already used
(`--primary`, `--green`, `--gold`, and so on), so the markup did not have to be
rewritten to pick up the palette.

### Booking calendar (`index.html`)

The calendar has its own, quieter palette: **22 `--cal-*` tokens defined once
in a block at the top of `index.html`**. Change a value there and the grid,
header, tabs, month buttons and desk dropdowns all follow. There are **no
literal colours** anywhere in the calendar's CSS or in the markup it generates.
Two small things use the shared tokens from `farillio.css` instead: the
live-sync badge (`--success` / `--warning`) and a few secondary-text notes
(`--text-light`).

- Comet Orange is a **spot colour**: the logo tile, plus the one active tab and
  the one active month (`#DA4628`).
- Forest green (`#205754`) carries the date and day columns and booked desks.
  Free desks are blush; floating desks have their own green-tinted set.
- The page is a warm `#F4EFED`; panels are white with 1px `#DFD2CE` borders and
  a soft warm shadow. Header bar and table headings are coral-pale `#F3BAAD`.
- Weekend and bank-holiday rows carry a tint (`#EEE8E5` and `#E9DFDB`); the date
  and day columns let it show through instead of turning green.
- The header logo is the coral icon cropped from `farillio_logo.jpg`, with the
  "farillio" wordmark cropped from the same file below it. The wordmark uses
  `mix-blend-mode: multiply` so the JPEG's white ground drops out.

### Incentives and raffle pages

These keep the earlier reskin: a dark **ink navy** (`#1F1838`) stage, and wheel
colours taken from the design system's muted **complimentary palette** (plum,
moss, steel blue, heather, brick, taupe) in place of the original hot pink,
violet and rainbow.

They are **not fully tokenised**. Every hex colour comes from `farillio.css`,
but both pages still contain the keyword `white` and a number of `rgba()`
shadows and translucent overlays as literals -- about 23 in `incentives.html`
and 18 in `raffle.html`, a few of them tints of the old palette. Moving them
into tokens would be a cosmetic clean-up only.

### Contrast

On `incentives.html` and `raffle.html`, every text/background pair on every tab
was measured against WCAG AA -- 4.5:1 for body text, 3:1 for large text -- and
all passed. A few long-standing problems were fixed along the way, including
white labels on coral "Free" desk dropdowns (2.3:1) and winner names that were
white on a pale card, so invisible.

On the booking calendar the specified pairs (header, tabs, month buttons,
table headings, date and day columns, booked and free desks, floating desks,
weekend and bank-holiday rows, month title) were measured the same way and all
pass **except one**: white on `#DA4628`, used for the active tab, the active
month and the buttons, is **4.30:1** against a 4.5:1 threshold. It is kept as
the specified brand colour; `#D23F20` would clear it (4.52:1). The calendar's
other tabs (dashboard, department tracking, user management) have not been
re-audited since the restyle.

When picking a colour, note that **Comet Orange `#FF5F3C` is only 3:1 on
white**, so it is a fill, not a text colour. Use `--comet-orange-deep`
(`#B72E15`, 6.2:1) for brand-coloured text.

### Fonts

Poppins is loaded from Google Fonts. The design system's hero face, Sharp
Sans Display, is **deliberately not used**: it is commercially licensed and
this repository is public, so the font file must not be published here.
Poppins carries the headings instead.

## Shared calendar module

`js/calendar-core.js` holds everything date-related that the three pages share:
bank holiday calculation, working-day checks, date formatting, the year picker,
and the remembered year. Change a rule there and all three pages follow.

## Running it locally

The pages use ES modules, so they need to be served over HTTP rather than
opened straight from disk:

```bash
python -m http.server 4173
```

Then open <http://127.0.0.1:4173/index.html>.
