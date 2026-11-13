import type { Member, WirdRecord } from "@/lib/wird";

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
}

export function initiativeGroups(data: Data, initiativeId: string): Group[] {
  return data.groups.filter((g) => g.initiativeId === initiativeId);
}

export function personName(data: Data, id: string | null): string | undefined {
  return data.people.find((p) => p.id === id)?.name;
}

/** Adding, editing, reordering and removing members: anyone who may open the group */
export function canManageMembers(data: Data, group: Group): boolean {
  return data.groups.some((g) => g.id === group.id);
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
