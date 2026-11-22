import { addDays, dateValue, fridayOnOrBefore, type Member, type WirdRecord } from "@/lib/wird";

/**
 * App data as the server sends it, mirroring the D1 tables
 * (initiatives, initiative_supervisors, staff, groups, members, records, marks),
 * limited to what the signed-in user may see: the initiatives she supervises and the groups she manages.
 */

/** Her part in an initiative: supervisor of all of it, or manager of some of its groups */
export type Role = "supervisor" | "manager";

/** The signed-in user; staffId stays null until she is invited or creates an initiative */
export interface Me {
  staffId: string | null;
  name: string;
  email: string;
  admin: boolean; // her email is in SUPERVISOR_EMAILS
  canCreate: boolean; // under the limit on initiatives she may create
}

/** Someone added by email: a supervisor of an initiative, or a group's manager */
export interface Person {
  id: string;
  name: string;
  email: string;
  linked: boolean; // has signed in at least once
}

export interface Initiative {
  id: string;
  name: string;
  role: Role;
  suspended: boolean; // closed by an app admin; nothing inside it is sent
  supervisorIds: string[]; // only filled in for initiatives she supervises
  logo: string | null; // version of its image, or null for none
  logoPlain: boolean; // shown without the tinted circle on screenshot headers
}

/** What app admins see of every initiative: no member names or records */
export interface InitiativeSummary {
  id: string;
  name: string;
  suspended: boolean;
  supervisors: { name: string; email: string }[];
  groups: number;
  members: number;
}

/** Initiatives one person may create; app admins have no limit */
export const INITIATIVE_LIMIT = 5;

/** Who a group's members are; it only changes the wording about them */
export type Audience = "girls" | "boys";

export interface Group {
  id: string;
  initiativeId: string;
  name: string;
  managerId: string | null;
  audience: Audience;
  createdAt: string; // YYYY-MM-DD
}

export type MarkKind = "kahf" | "mulk";

/** A surah read on a day, shown as a flower in the group table */
export interface Mark {
  memberId: string;
  date: string;
  kind: MarkKind;
}

export interface Data {
  me: Me;
  initiatives: Initiative[];
  people: Person[]; // supervisors and managers of the initiatives she supervises, and herself
  groups: Group[]; // every group she may open, and so manage
  members: Member[]; // array order is the numbering order within each group
  records: WirdRecord[];
  marks: Mark[];
  sends: TableSend[]; // the days each group's table was sent
}

/** «أرسلتُ الجدول ✓»: the group's manager sent the daily table on WhatsApp that day */
export interface TableSend {
  groupId: string;
  date: string;
}

/** Initiative images are served separately, so the data stays small; the version makes each URL cacheable */
export function imageUrl(initiativeId: string, version: string): string {
  return `/api/image/initiative/${encodeURIComponent(initiativeId)}?v=${version}`;
}

/**
 * Two initiative names count as the same when they match without spaces, Arabic diacritics (harakat,
 * tanween, shadda) and tatweel: «مبادرة رواق» = «مبادرةرواق» = «مبادرةُ رِواق».
 */
export function sameName(a: string, b: string): boolean {
  const key = (s: string) => s.replace(/[\s\u0640\u064B-\u065F\u0670]/gu, "").toLowerCase();
  return key(a) === key(b);
}

/** She already supervises another initiative with this name */
export function hasInitiativeNamed(data: Data, name: string, exceptId?: string): boolean {
  return data.initiatives.some(
    (i) => i.role === "supervisor" && i.id !== exceptId && sameName(i.name, name),
  );
}

export function initiativeGroups(data: Data, initiativeId: string): Group[] {
  return data.groups.filter((g) => g.initiativeId === initiativeId);
}

export function personName(data: Data, id: string | null): string | undefined {
  return data.people.find((p) => p.id === id)?.name;
}

/** Adding, editing and removing members: the group's manager and its initiative's supervisors */
export function canManageMembers(data: Data, group: Group): boolean {
  return data.groups.some((g) => g.id === group.id);
}

/**
 * The group's manager does the daily work: readings, Kahf/Mulk, order, the table.
 * A supervisor who manages the group herself does it as its manager.
 */
export function isGroupManager(data: Data, group: Group): boolean {
  return data.me.staffId !== null && group.managerId === data.me.staffId;
}

export function tableSentOn(data: Data, groupId: string, date: string): boolean {
  return data.sends.some((s) => s.groupId === groupId && s.date === date);
}

/** The latest day the group's table was sent, up to `today`, or null */
export function lastSent(data: Data, groupId: string, today: string): string | null {
  let last: string | null = null;
  for (const s of data.sends) {
    if (s.groupId === groupId && s.date <= today && (!last || s.date > last)) last = s.date;
  }
  return last;
}

export type GroupStatus = "green" | "yellow" | "red";

export interface GroupHealth {
  members: number;
  active: number; // at least one reading in the last 7 days
  sentDaysAgo: number | null; // 0 = today; null = never
  status: GroupStatus;
}

const dayNumber = (date: string) => Math.round(Date.parse(`${date}T00:00:00Z`) / 86_400_000);

/**
 * How a group is doing, for its supervisor. The colour is about sending the table only: green when
 * today's table was sent, yellow when not yet today (sent 1–2 days ago), red when no table was sent
 * for 3 days or more, or ever. Member activity is reported separately.
 */
export function groupHealth(data: Data, group: Group, today: string): GroupHealth {
  const members = groupMembers(data, group.id);
  const weekAgo = dayNumber(today) - 6;
  const active = members.filter((m) =>
    data.records.some(
      (r) => r.memberId === m.id && r.date <= today && dayNumber(r.date) >= weekAgo,
    ),
  ).length;
  const last = lastSent(data, group.id, today);
  const sentDaysAgo = last === null ? null : dayNumber(today) - dayNumber(last);
  const status: GroupStatus =
    sentDaysAgo === null || sentDaysAgo >= 3 ? "red" : sentDaysAgo === 0 ? "green" : "yellow";
  return { members: members.length, active, sentDaysAgo, status };
}

/** An initiative always keeps at least one supervisor */
export function canRemoveSupervisor(initiative: Initiative): boolean {
  return initiative.supervisorIds.length > 1;
}

export function groupMembers(data: Data, groupId: string): Member[] {
  return data.members.filter((m) => m.groupId === groupId);
}

/** Swap a member with her neighbour in the same group */
export function moveMember(members: Member[], id: string, dir: -1 | 1): Member[] {
  const i = members.findIndex((m) => m.id === id);
  if (i < 0) return members;
  let j = i + dir;
  while (j >= 0 && j < members.length && members[j].groupId !== members[i].groupId) j += dir;
  if (j < 0 || j >= members.length) return members;
  const next = [...members];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/**
 * The Kahf light on a day: a tick on the Thursday or Friday of the most recent Friday up to that day.
 * On a Thursday, that day's own tick counts too (for the coming Friday), so the light never goes
 * out on Thursday; from Saturday, only that week's Thursday or Friday tick counts.
 */
export function kahfLight(marks: Mark[], memberId: string, date: string): boolean {
  const friday = fridayOnOrBefore(date);
  const days = [addDays(friday, -1), friday];
  if (dateValue(date).getDay() === 4) days.push(date);
  return marks.some((k) => k.memberId === memberId && k.kind === "kahf" && days.includes(k.date));
}

export function hasMark(marks: Mark[], memberId: string, date: string, kind: MarkKind): boolean {
  return marks.some((k) => k.memberId === memberId && k.date === date && k.kind === kind);
}

export function setMark(
  marks: Mark[],
  memberId: string,
  date: string,
  kind: MarkKind,
  on: boolean,
): Mark[] {
  const rest = marks.filter(
    (k) => !(k.memberId === memberId && k.date === date && k.kind === kind),
  );
  return on ? [...rest, { memberId, date, kind }] : rest;
}

/** Remove members with their history */
export function withoutMembers(data: Data, ids: Set<string>): Data {
  return {
    ...data,
    members: data.members.filter((m) => !ids.has(m.id)),
    records: data.records.filter((r) => !ids.has(r.memberId)),
    marks: data.marks.filter((k) => !ids.has(k.memberId)),
  };
}
