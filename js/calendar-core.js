/**
 * Farillio Office Bookings — shared calendar core.
 *
 * Makes the booking system perpetual: bank holidays are computed for any
 * year rather than hardcoded, and the selected year is shared across the
 * booking calendar, incentives and raffle pages.
 *
 * Booking keys stay in the existing `YYYY-MM-DD_deskN` / `YYYY-MM-DD_floatingN`
 * format, so historic data needs no migration.
 */

export const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

/** First year the office booking records exist for. */
export const YEAR_MIN = 2026;

/** How many years ahead of today staff may book. */
const YEARS_AHEAD = 5;

/** Latest selectable year — rolls forward on its own, so this never expires. */
export function getYearMax() {
    return new Date().getFullYear() + YEARS_AHEAD;
}

/** Every year offered in the year picker. */
export function getSelectableYears() {
    const years = [];
    for (let y = YEAR_MIN; y <= getYearMax(); y++) years.push(y);
    return years;
}

/* ------------------------------------------------------------------ */
/* Bank holidays                                                       */
/* ------------------------------------------------------------------ */

/**
 * One-off or non-standard bank holidays that no formula can predict
 * (royal events, jubilees, state funerals, and the like).
 *
 * Add them here as `YEAR: ['YYYY-MM-DD', ...]` and they are merged into
 * the computed list for that year. Example:
 *     2027: ['2027-06-04'],
 */
export const BANK_HOLIDAY_OVERRIDES = {
    // 2027: ['2027-06-04'],
};

/**
 * Dates that would normally be computed as bank holidays but should not be
 * treated as such, keyed the same way as BANK_HOLIDAY_OVERRIDES.
 */
export const BANK_HOLIDAY_EXCLUSIONS = {};

/** Format a Date as a local `YYYY-MM-DD` string (no UTC drift). */
export function toDateStr(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Easter Sunday for a given year (Anonymous Gregorian algorithm). */
function easterSunday(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);   // 3 = March, 4 = April
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

/** Nth occurrence of a weekday in a month. `weekday`: 0 = Sun ... 6 = Sat. */
function nthWeekdayOfMonth(year, month, weekday, n) {
    const first = new Date(year, month, 1);
    const offset = (weekday - first.getDay() + 7) % 7;
    return new Date(year, month, 1 + offset + (n - 1) * 7);
}

/** Last occurrence of a weekday in a month. */
function lastWeekdayOfMonth(year, month, weekday) {
    const last = new Date(year, month + 1, 0);
    const offset = (last.getDay() - weekday + 7) % 7;
    return new Date(year, month, last.getDate() - offset);
}

/**
 * Move a date to the next weekday that is not already spoken for — the
 * England and Wales "substitute day" rule for holidays landing on a weekend.
 */
function substituteIfWeekend(date, taken) {
    const result = new Date(date);
    while (result.getDay() === 0 || result.getDay() === 6 || taken.has(toDateStr(result))) {
        result.setDate(result.getDate() + 1);
    }
    return result;
}

/**
 * Bank holidays that carry their own name in the calendar. The key is the
 * holiday's identity, not its date: Christmas and New Year both move to a
 * substitute weekday when they land on a weekend, and the name follows the
 * substitute. Anything not listed here shows DEFAULT_BANK_HOLIDAY_LABEL.
 */
export const BANK_HOLIDAY_LABELS = {
    newYear:   { name: 'New Year',  icon: '🎆' },
    christmas: { name: 'Christmas', icon: '🎄' }
};

export const DEFAULT_BANK_HOLIDAY_LABEL = { name: 'Bank Holiday', icon: '🏖️' };

const holidayCache = new Map();
const holidayLabelCache = new Map();

/**
 * UK (England and Wales) bank holidays for any year, as `YYYY-MM-DD` strings.
 * Results are cached per year.
 */
export function getBankHolidays(year) {
    if (holidayCache.has(year)) return holidayCache.get(year);

    const taken = new Set();
    const labels = {};
    const add = (date, key) => {
        const str = toDateStr(date);
        taken.add(str);
        if (key) labels[str] = key;
        return str;
    };

    const dates = [];

    // New Year's Day (substituted if it lands on a weekend)
    dates.push(add(substituteIfWeekend(new Date(year, 0, 1), taken), 'newYear'));

    // Good Friday and Easter Monday
    const easter = easterSunday(year);
    const goodFriday = new Date(easter);
    goodFriday.setDate(easter.getDate() - 2);
    const easterMonday = new Date(easter);
    easterMonday.setDate(easter.getDate() + 1);
    dates.push(add(goodFriday));
    dates.push(add(easterMonday));

    // Early May bank holiday — first Monday in May
    dates.push(add(nthWeekdayOfMonth(year, 4, 1, 1)));

    // Spring bank holiday — last Monday in May
    dates.push(add(lastWeekdayOfMonth(year, 4, 1)));

    // Summer bank holiday — last Monday in August
    dates.push(add(lastWeekdayOfMonth(year, 7, 1)));

    // Christmas Day and Boxing Day, each substituted forward if on a weekend
    dates.push(add(substituteIfWeekend(new Date(year, 11, 25), taken), 'christmas'));
    dates.push(add(substituteIfWeekend(new Date(year, 11, 26), taken)));

    const excluded = new Set(BANK_HOLIDAY_EXCLUSIONS[year] || []);
    const result = [...new Set([...dates, ...(BANK_HOLIDAY_OVERRIDES[year] || [])])]
        .filter(d => !excluded.has(d))
        .sort();

    holidayCache.set(year, result);
    holidayLabelCache.set(year, labels);
    return result;
}

/**
 * How a bank holiday should be labelled: the named one where we have a name
 * (Christmas, New Year), otherwise the generic bank holiday label. Returns
 * null when the date is not a bank holiday at all.
 */
export function getBankHolidayLabel(dateStr) {
    if (!isBankHoliday(dateStr)) return null;
    const year = Number(dateStr.slice(0, 4));
    const key = (holidayLabelCache.get(year) || {})[dateStr];
    return BANK_HOLIDAY_LABELS[key] || DEFAULT_BANK_HOLIDAY_LABEL;
}

/** Is this `YYYY-MM-DD` string a UK bank holiday? Works for any year. */
export function isBankHoliday(dateStr) {
    if (!dateStr) return false;
    const year = Number(dateStr.slice(0, 4));
    if (!Number.isFinite(year)) return false;
    return getBankHolidays(year).includes(dateStr);
}

/** Is this Date a bookable working day (not a weekend, not a bank holiday)? */
export function isWorkingDay(date) {
    const day = date.getDay();
    if (day === 0 || day === 6) return false;
    return !isBankHoliday(toDateStr(date));
}

/* ------------------------------------------------------------------ */
/* Selected year — shared across pages                                 */
/* ------------------------------------------------------------------ */

const YEAR_STORAGE_KEY = 'farillio.bookings.selectedYear';

/**
 * The chosen year is kept in sessionStorage, not localStorage, on purpose.
 *
 * It needs to carry as you move between the booking, incentives and raffle
 * pages — but a fresh open should always land on today's year (and so today's
 * month), rather than wherever somebody happened to browse to weeks ago.
 */
function yearStore() {
    return sessionStorage;
}

/** Clamp a year into the selectable range. */
function clampYear(year) {
    return Math.min(Math.max(year, YEAR_MIN), getYearMax());
}

/**
 * The year currently being viewed. Defaults to today's year (clamped into
 * range) and is remembered across pages and reloads.
 */
export function getSelectedYear() {
    let stored = null;
    try {
        stored = yearStore().getItem(YEAR_STORAGE_KEY);
    } catch (e) {
        // Private browsing or storage disabled — fall through to today's year.
    }
    const parsed = Number(stored);
    if (Number.isFinite(parsed) && parsed >= YEAR_MIN && parsed <= getYearMax()) {
        return parsed;
    }
    return clampYear(new Date().getFullYear());
}

/** Remember the year being viewed. Returns the (clamped) year actually set. */
export function setSelectedYear(year) {
    const safe = clampYear(Number(year) || new Date().getFullYear());
    try {
        yearStore().setItem(YEAR_STORAGE_KEY, String(safe));
    } catch (e) {
        // Storage unavailable — the year still applies for this page view.
    }
    return safe;
}

/**
 * Sensible default date range for a year: today plus the next 13 days when
 * viewing the current year, otherwise the first two weeks of that year.
 */
export function defaultRangeForYear(year) {
    const today = new Date();
    const start = today.getFullYear() === year ? today : new Date(year, 0, 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 13);
    if (end.getFullYear() > year) {
        end.setTime(new Date(year, 11, 31).getTime());
    }
    return { start: toDateStr(start), end: toDateStr(end) };
}

/** Apply a year's bounds and defaults to a pair of date inputs. */
export function applyYearToDateInputs(startInput, endInput, year) {
    if (!startInput || !endInput) return;
    const min = `${year}-01-01`;
    const max = `${year}-12-31`;
    const { start, end } = defaultRangeForYear(year);

    startInput.min = min;
    startInput.max = max;
    endInput.min = min;
    endInput.max = max;

    // Only rewrite the values if they have fallen outside the selected year.
    if (!startInput.value || startInput.value < min || startInput.value > max) {
        startInput.value = start;
    }
    if (!endInput.value || endInput.value < min || endInput.value > max) {
        endInput.value = end;
    }
}

/**
 * Build a year picker (back / dropdown / forward) into a container element.
 * Calls `onChange(year)` whenever the year changes.
 */
export function renderYearPicker(container, year, onChange) {
    if (!container) return;

    const years = getSelectableYears();
    container.innerHTML = `
        <button type="button" class="year-nav" data-step="-1" aria-label="Previous year">&#9664;</button>
        <select class="year-select" aria-label="Select year">
            ${years.map(y => `<option value="${y}"${y === year ? ' selected' : ''}>${y}</option>`).join('')}
        </select>
        <button type="button" class="year-nav" data-step="1" aria-label="Next year">&#9654;</button>
    `;

    const select = container.querySelector('.year-select');

    const refreshArrows = (current) => {
        container.querySelectorAll('.year-nav').forEach(btn => {
            const target = current + Number(btn.dataset.step);
            btn.disabled = target < YEAR_MIN || target > getYearMax();
        });
    };

    const sync = (next) => {
        const safe = setSelectedYear(next);
        select.value = String(safe);
        refreshArrows(safe);
        onChange(safe);
    };

    select.addEventListener('change', () => sync(Number(select.value)));
    container.querySelectorAll('.year-nav').forEach(btn => {
        btn.addEventListener('click', () => sync(Number(select.value) + Number(btn.dataset.step)));
    });

    refreshArrows(year);
}
