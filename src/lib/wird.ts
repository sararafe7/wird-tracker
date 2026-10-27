/** Total pages in the standard Madinah mushaf */
export const TOTAL_PAGES = 604;

/** The wird day ends at this local hour (around Fajr), not at midnight */
export const DAY_START_HOUR = 5;

export interface Member {
  id: string;
  groupId: string;
  name: string;
  daily: number; // pages per day
  startPage: number; // page she was at before her first record, 1..TOTAL_PAGES
}

/** One recorded day: value multiplies her daily pages; 0 counts the day without moving pages */
export interface WirdRecord {
  memberId: string;
  date: string; // YYYY-MM-DD wird day
  value: number;
  daily: number; // her daily pages when recorded, so later changes keep history intact
}

/** A page range; a wird that passes the last page splits into two */
export type Span = { from: number; to: number };

export interface DayView {
  record: WirdRecord | null;
  spans: Span[]; // what she read (recorded) or what is due (not recorded)
  page: number; // page she starts the day on
}

export function clampDaily(daily: number): number {
  return Math.min(TOTAL_PAGES, Math.max(1, Math.round(daily)));
}

export function clampPage(page: number): number {
  return Math.min(TOTAL_PAGES, Math.max(1, Math.round(page)));
}

// Avoid float drift from values like 0.3 when summing pages
const tidy = (x: number) => Math.round(x * 1e6) / 1e6;

export const recordPages = (r: WirdRecord) => tidy(r.value * r.daily);

/** Mushaf page holding an absolute offset (pages read since page 1 of the first khatma) */
function pageAt(offset: number): number {
  return (Math.floor(offset) % TOTAL_PAGES) + 1;
}

/** Pages touched when reading `pages` from `offset`, split at each khatma boundary */
export function spansAt(offset: number, pages: number): Span[] {
  if (pages <= 0) return [];
  const first = Math.floor(offset) + 1;
  const last = Math.max(first, Math.ceil(tidy(offset + pages)));
  const out: Span[] = [];
  for (let a = first; a <= last; ) {
    const base = Math.floor((a - 1) / TOTAL_PAGES) * TOTAL_PAGES;
    const b = Math.min(last, base + TOTAL_PAGES);
    out.push({ from: a - base, to: b - base });
    a = b + 1;
  }
  return out;
}

function memberRecords(records: WirdRecord[], memberId: string): WirdRecord[] {
  return records.filter((r) => r.memberId === memberId);
}

function offsetBefore(member: Member, records: WirdRecord[], date: string): number {
  let offset = member.startPage - 1;
  for (const r of memberRecords(records, member.id)) {
    if (r.date < date) offset += recordPages(r);
  }
  return tidy(offset);
}

export function dayView(member: Member, records: WirdRecord[], date: string): DayView {
  const offset = offsetBefore(member, records, date);
  const record = memberRecords(records, member.id).find((r) => r.date === date) ?? null;
  const pages = record ? recordPages(record) : member.daily;
  return { record, spans: spansAt(offset, pages), page: pageAt(offset) };
}

/** Completed khatmas across all her records */
export function khatmat(member: Member, records: WirdRecord[]): number {
  const total = memberRecords(records, member.id).reduce((sum, r) => sum + recordPages(r), 0);
  return Math.floor(tidy(member.startPage - 1 + total) / TOTAL_PAGES);
}

/** Days with any record (including 0) and pages read, within [from, to] inclusive */
export function stats(
  records: WirdRecord[],
  memberId: string,
  from: string,
  to: string,
): { days: number; pages: number } {
  const inRange = memberRecords(records, memberId).filter((r) => r.date >= from && r.date <= to);
  return {
    days: inRange.length,
    pages: tidy(inRange.reduce((sum, r) => sum + recordPages(r), 0)),
  };
}

export function setRecord(
  records: WirdRecord[],
  member: Member,
  date: string,
  value: number,
): WirdRecord[] {
  const existing = records.find((r) => r.memberId === member.id && r.date === date);
  const record: WirdRecord = {
    memberId: member.id,
    date,
    value: Math.max(0, value),
    daily: existing?.daily ?? member.daily,
  };
  return [...records.filter((r) => r !== existing), record].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

export function removeRecord(records: WirdRecord[], memberId: string, date: string): WirdRecord[] {
  return records.filter((r) => !(r.memberId === memberId && r.date === date));
}

export function localDate(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The wird day for a moment: before DAY_START_HOUR it still belongs to the previous day */
export function wirdDate(now = new Date()): string {
  const d = new Date(now);
  if (d.getHours() < DAY_START_HOUR) d.setDate(d.getDate() - 1);
  return localDate(d);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return localDate(d);
}

/** Midday on a YYYY-MM-DD date, safe for formatting in any time zone offset */
export function dateValue(date: string): Date {
  return new Date(`${date}T12:00:00`);
}
