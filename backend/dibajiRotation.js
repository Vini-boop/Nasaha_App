/**
 * Dibaji Rotation Service
 *
 * Implements a strict Sunday–Saturday weekly cycle with:
 *  - Exactly ONE Dibaji active per 24-hour day
 *  - Deterministic Mulberry32 PRNG seeded by YYYY-MM-DD (Africa/Nairobi)
 *  - Weekly history that resets every Sunday at 00:00 Nairobi time
 *  - Queue that avoids repeating within the same week
 *  - A single authoritative /api/dibaji/current endpoint consumed by both
 *    admin and mobile — no duplicated logic on the client
 */

'use strict';

const TIMEZONE = 'Africa/Nairobi';
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── Timezone helpers ──────────────────────────────────────────────────────────

/**
 * Returns a plain object { year, month, day, dayOfWeek, dateStr }
 * for "right now" in Africa/Nairobi, without any external library.
 *
 * We use Intl.DateTimeFormat to extract the local calendar fields and
 * reconstruct a UTC midnight timestamp so we can do reliable arithmetic.
 */
function getNairobiNow() {
  const now = new Date();
  // Extract individual parts from the Nairobi locale
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // en-CA gives us "YYYY-MM-DD" directly
  const dateStr = fmt.format(now); // e.g. "2026-07-14"
  const [year, month, day] = dateStr.split('-').map(Number);

  // Determine day of week in Nairobi
  const fmtWeekday = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    weekday: 'long',
  });
  const weekdayName = fmtWeekday.format(now); // "Tuesday"
  const dayOfWeek = DAY_NAMES.indexOf(weekdayName); // 0=Sun … 6=Sat

  return { year, month, day, dayOfWeek, dateStr, weekdayName };
}

/**
 * Returns "YYYY-MM-DD" for a date that is `offsetDays` before `dateStr`.
 * dateStr must be in "YYYY-MM-DD" format.
 */
function subtractDays(dateStr, offsetDays) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - offsetDays);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * Returns the "YYYY-MM-DD" of the most recent Sunday on or before dateStr.
 */
function getSundayOfWeek(dateStr, dayOfWeek) {
  return subtractDays(dateStr, dayOfWeek); // dayOfWeek 0=Sun means offset 0
}

// ── Mulberry32 PRNG ───────────────────────────────────────────────────────────

/**
 * Mulberry32 — a high-quality 32-bit seeded PRNG.
 * Returns a float in [0, 1).
 *
 * Given the same seed it always produces the same sequence, making selection
 * deterministic across admin, mobile, and server restarts.
 */
function mulberry32(seed) {
  let t = (seed + 0x6D2B79F5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Converts a "YYYY-MM-DD" string into a stable integer seed.
 * e.g. "2026-07-14" → 20260714
 */
function dateSeed(dateStr) {
  return parseInt(dateStr.replace(/-/g, ''), 10); // 20260714
}

/**
 * Pick one dibaji from `allDibaji` for the given dateStr, avoiding IDs in
 * `usedIds` if possible. Falls back to any random pick if all are used.
 *
 * Returns the selected dibaji object.
 */
function pickDibaji(allDibaji, dateStr, usedIds = []) {
  if (!allDibaji || allDibaji.length === 0) return null;

  const seed = dateSeed(dateStr);
  const available = allDibaji.filter(d => !usedIds.includes(d.id));
  const pool = available.length > 0 ? available : allDibaji;

  const rnd = mulberry32(seed);
  const idx = Math.floor(rnd * pool.length);
  return pool[idx];
}

// ── Core rotation algorithm ───────────────────────────────────────────────────

/**
 * Compute the full rotation state for today.
 *
 * @param {Array}  allDibaji  - All dibaji rows from the DB
 * @param {Object} stored     - Previously stored rotation row from DB (may be null)
 * @returns {Object}          - { activeDibaji, history, queue, cycleStart, timezone, sundayDate }
 */
function computeRotation(allDibaji, stored) {
  const { dateStr, dayOfWeek, weekdayName } = getNairobiNow();

  // Date of this week's Sunday
  const sundayDate = getSundayOfWeek(dateStr, dayOfWeek);

  // ── CASE 1: We already have a valid record for today ──────────────────────
  if (stored && stored.active_date === dateStr) {
    return {
      activeDibaji: {
        ...stored.active_dibaji,
        date: dateStr,
        day: weekdayName,
      },
      history: stored.history || [],
      queue: stored.queue || [],
      cycleStart: 'Sunday',
      timezone: TIMEZONE,
      sundayDate,
    };
  }

  // ── CASE 2: Sunday — fresh weekly cycle ───────────────────────────────────
  if (dayOfWeek === 0) {
    const sundayDibaji = pickDibaji(allDibaji, dateStr, []);
    const queue = [{ value: sundayDibaji, generatedDate: dateStr }];

    return {
      activeDibaji: { ...sundayDibaji, date: dateStr, day: 'Sunday' },
      history: [], // reset on every Sunday
      queue,
      cycleStart: 'Sunday',
      timezone: TIMEZONE,
      sundayDate,
    };
  }

  // ── CASE 3: Mon–Sat — incremental rotation inside the current week ────────
  // Reconstruct the history for every day from Sunday up to (but not including) today.
  // This is fully deterministic: if stored state is missing or stale we can rebuild it.

  const history = [];
  const usedIds = [];
  let weekQueue = [];

  // Generate Sunday's pick first (always day 0 of the week)
  const sundayPick = pickDibaji(allDibaji, sundayDate, []);
  if (sundayPick) {
    usedIds.push(sundayPick.id);
    weekQueue.push({ value: sundayPick, generatedDate: sundayDate });
  }

  // Walk Mon (1) through yesterday (dayOfWeek - 1), building history
  for (let d = 1; d < dayOfWeek; d++) {
    const dayDateStr = subtractDays(dateStr, dayOfWeek - d);
    const dayPick = pickDibaji(allDibaji, dayDateStr, usedIds);
    if (dayPick) {
      usedIds.push(dayPick.id);
      weekQueue.push({ value: dayPick, generatedDate: dayDateStr });
      history.unshift({ // newest first
        ...dayPick,
        date: dayDateStr,
        day: DAY_NAMES[d],
      });
    }
  }

  // Sunday's entry goes at the END of history (oldest)
  if (sundayPick) {
    history.push({ ...sundayPick, date: sundayDate, day: 'Sunday' });
  }

  // Today's pick — avoid all IDs used so far this week
  const todayPick = pickDibaji(allDibaji, dateStr, usedIds);
  if (todayPick) {
    usedIds.push(todayPick.id);
    weekQueue.push({ value: todayPick, generatedDate: dateStr });
  }

  return {
    activeDibaji: { ...(todayPick || allDibaji[0]), date: dateStr, day: weekdayName },
    history,
    queue: weekQueue,
    cycleStart: 'Sunday',
    timezone: TIMEZONE,
    sundayDate,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * getOrComputeRotation
 *
 * Main entry point called by the Express route handler.
 * Loads all dibaji from the DB, loads the stored rotation state, recomputes
 * if stale, persists the new state, and returns the result.
 *
 * @param {Pool} pool  - pg Pool instance
 * @returns {Object}   - rotation result matching the required data structure
 */
async function getOrComputeRotation(pool) {
  // 1. Fetch all available dibaji
  const allRes = await pool.query('SELECT * FROM dibaji ORDER BY "createdAt" ASC');
  const allDibaji = allRes.rows;

  if (allDibaji.length === 0) {
    return {
      activeDibaji: null,
      history: [],
      queue: [],
      cycleStart: 'Sunday',
      timezone: TIMEZONE,
    };
  }

  // 2. Load stored rotation state
  let stored = null;
  try {
    const storeRes = await pool.query(
      "SELECT * FROM dibaji_rotation WHERE id = 'global' LIMIT 1"
    );
    if (storeRes.rows.length > 0) {
      stored = storeRes.rows[0];
    }
  } catch (_) {
    // Table may not exist yet — will be created below
  }

  // 3. Compute current rotation
  const { dateStr, dayOfWeek } = getNairobiNow();
  const result = computeRotation(allDibaji, stored);

  // 4. Persist if state changed (new day or new week)
  const needsSave =
    !stored ||
    stored.active_date !== dateStr ||
    (dayOfWeek === 0 && stored.sunday_date !== result.sundayDate);

  if (needsSave) {
    await pool.query(`
      INSERT INTO dibaji_rotation (id, active_date, sunday_date, active_dibaji, history, queue, updated_at)
      VALUES ('global', $1, $2, $3, $4, $5, NOW())
      ON CONFLICT (id) DO UPDATE
        SET active_date   = EXCLUDED.active_date,
            sunday_date   = EXCLUDED.sunday_date,
            active_dibaji = EXCLUDED.active_dibaji,
            history       = EXCLUDED.history,
            queue         = EXCLUDED.queue,
            updated_at    = NOW()
    `, [
      dateStr,
      result.sundayDate,
      JSON.stringify(result.activeDibaji),
      JSON.stringify(result.history),
      JSON.stringify(result.queue),
    ]);
  }

  return result;
}

module.exports = { getOrComputeRotation, computeRotation, getNairobiNow, pickDibaji };
