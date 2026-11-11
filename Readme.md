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
pages link. **No page contains a hard-coded colour** -- change a value there
and all three follow.

That file also keeps aliases for the names the pages already used
(`--primary`, `--green`, `--gold`, and so on), so the markup did not have to
be rewritten to pick up the palette.

What changed from the original:

- The hot pink, violet and Tailwind-rainbow wheel colours are gone. Accents
  now come from the design system's **complimentary palette** -- plum, moss,
  steel blue, heather, brick, taupe -- which is muted by design.
- Comet Orange is used as a **spot colour**, not as large fills. The month
  grid, page headers and table headings are quiet surfaces; orange marks the
  one thing that is selected.
- The near-black panels on the incentives and raffle pages are now the
  brand's own **ink navy** (`#1F1838`).
- Page backgrounds are the design system's warm **light grey** (`#EDE8E6`),
  not white, and shadows are warm-tinted rather than neutral grey.

### Contrast

Every text/background pair on all three pages (and every tab) was measured
against WCAG AA -- 4.5:1 for body text, 3:1 for large text -- and all pass.
A few long-standing problems were fixed along the way, including white
labels on coral "Free" desk dropdowns (2.3:1) and winner names that were
white on a pale card, so invisible.

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
