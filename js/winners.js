/**
 * Farillio Office Bookings — raffle winners log and cooldown rule.
 *
 * Stored in its own Firestore document (`bookingData/winners`) rather than
 * alongside the bookings. The booking page saves `bookingData/main` with a
 * whole-document overwrite, so anything kept there would be wiped the next
 * time somebody books a desk.
 */

import {
    doc,
    setDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import { toDateStr } from "./calendar-core.js";

/** Winners stay blocked from the draw for this many months after a win. */
export const COOLDOWN_MONTHS = 3;

const WINNERS_DOC = ['bookingData', 'winners'];

/* ------------------------------------------------------------------ */
/* Reading and writing the log                                         */
/* ------------------------------------------------------------------ */

/**
 * Listen to the winners log. Calls `onChange(winners)` with a newest-first
 * array every time it changes, and once immediately with what is stored.
 */
export function subscribeWinners(db, onChange, onError) {
    const ref = doc(db, ...WINNERS_DOC);
    return onSnapshot(ref, (snap) => {
        const data = snap.exists() ? snap.data() : {};
        onChange(sortWinners(data.winners || []));
    }, (error) => {
        console.error('Winners log sync error:', error);
        if (onError) onError(error);
    });
}

/** Newest draw first; ties broken by when the entry was recorded. */
export function sortWinners(winners) {
    return [...winners].sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return (b.recordedAt || '').localeCompare(a.recordedAt || '');
    });
}

async function saveWinners(db, winners) {
    await setDoc(doc(db, ...WINNERS_DOC), {
        winners: sortWinners(winners),
        lastUpdated: new Date().toISOString()
    });
}

/** Add a win to the log. Returns the entry that was stored. */
export async function addWinner(db, winners, { name, prize, emoji = '🎁', date, note = '' }) {
    if (!name) throw new Error('A winner needs a name.');

    const entry = {
        id: `w_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name,
        prize: prize || 'Prize not recorded',
        emoji,
        date: date || toDateStr(new Date()),
        note,
        recordedAt: new Date().toISOString()
    };

    await saveWinners(db, [...winners, entry]);
    return entry;
}

/** Remove one entry from the log by id. */
export async function removeWinner(db, winners, id) {
    await saveWinners(db, winners.filter(w => w.id !== id));
}

/* ------------------------------------------------------------------ */
/* The cooldown rule                                                   */
/* ------------------------------------------------------------------ */

/**
 * The date on which a cooldown starting from `asOf` began — i.e. wins on or
 * after this date still count as recent.
 */
export function cooldownStartDate(asOf = new Date(), months = COOLDOWN_MONTHS) {
    const start = new Date(asOf);
    start.setMonth(start.getMonth() - months);
    return start;
}

/**
 * Names blocked from the draw because they have won within the cooldown
 * window, as a Map of name -> the most recent blocking win.
 *
 * Case-insensitive on the name, since the log is typed by hand.
 */
export function getBlockedWinners(winners, asOf = new Date(), months = COOLDOWN_MONTHS) {
    const cutoff = toDateStr(cooldownStartDate(asOf, months));
    const asOfStr = toDateStr(asOf);
    const blocked = new Map();

    for (const win of winners) {
        // A win dated in the future shouldn't block anybody yet.
        if (!win.date || win.date < cutoff || win.date > asOfStr) continue;

        const key = win.name.trim().toLowerCase();
        const existing = blocked.get(key);
        if (!existing || win.date > existing.date) {
            blocked.set(key, win);
        }
    }

    return blocked;
}

/** Is this name currently blocked? */
export function isBlocked(blockedMap, name) {
    return blockedMap.has(String(name).trim().toLowerCase());
}

/** The win that is blocking this name, or null. */
export function blockingWin(blockedMap, name) {
    return blockedMap.get(String(name).trim().toLowerCase()) || null;
}

/** The date a blocked name becomes eligible again. */
export function eligibleAgainOn(win, months = COOLDOWN_MONTHS) {
    const date = new Date(win.date);
    date.setMonth(date.getMonth() + months);
    return date;
}

/** "3 Feb 2027" — short, readable, unambiguous. */
export function formatDate(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

/* ------------------------------------------------------------------ */
/* Summaries for the dashboard                                         */
/* ------------------------------------------------------------------ */

/**
 * Per-person totals across the whole log, most wins first.
 * Names are grouped case-insensitively but reported as last spelled.
 */
export function winsByPerson(winners) {
    const totals = new Map();

    for (const win of winners) {
        const key = win.name.trim().toLowerCase();
        const entry = totals.get(key) || { name: win.name.trim(), count: 0, lastWin: null };
        entry.count += 1;
        if (!entry.lastWin || win.date > entry.lastWin) {
            entry.lastWin = win.date;
            entry.name = win.name.trim();
        }
        totals.set(key, entry);
    }

    return [...totals.values()].sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return (b.lastWin || '').localeCompare(a.lastWin || '');
    });
}

/** Winners whose draw date falls in the given calendar year. */
export function winnersInYear(winners, year) {
    return winners.filter(w => w.date && Number(w.date.slice(0, 4)) === year);
}
