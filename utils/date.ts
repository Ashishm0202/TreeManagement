/**
 * Date handling for the tree's DOB.
 *
 * Three shapes are in play and they are deliberately kept apart:
 *  - the API sends and accepts ISO strings ("2019-03-12T00:00:00")
 *  - the form holds a plain calendar day ("2019-03-12")
 *  - the picker works in `Date` objects
 *
 * Everything parses to *local* midnight rather than going through
 * `new Date("2019-03-12")`, which resolves to UTC midnight and lands on the
 * previous day for anyone west of Greenwich.
 */

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** API string → the "YYYY-MM-DD" the form holds. Anything unparseable is "". */
export function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const match = DAY_PATTERN.exec(value);
  return match ? match[0] : "";
}

/** Form string → a `Date` at local midnight, for the picker. */
export function parseDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = DAY_PATTERN.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `Date` → the "YYYY-MM-DD" the form holds. */
export function toDateInputFromDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Form string → what goes on the wire: the bare calendar day, "2026-09-03".
 * No time and no zone suffix, so the server stores the day that was picked
 * rather than one shifted by the device's offset.
 */
export function toApiDate(value: string | null | undefined): string | null {
  return toDateInput(value) || null;
}

/** Form string → "12 Mar 2019" for display. */
export function formatDateLabel(value: string | null | undefined): string {
  const date = parseDateInput(value);
  if (!date) return "";
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Completed years between the DOB and today — the tree's age is always derived
 * from its date of birth, never stored independently of it.
 */
export function ageFromDob(value: string | null | undefined, now = new Date()): number | null {
  const dob = parseDateInput(toDateInput(value));
  if (!dob) return null;

  let age = now.getFullYear() - dob.getFullYear();
  const monthDelta = now.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }

  return Math.max(age, 0);
}
