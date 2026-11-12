import type { Member, WirdRecord } from "@/lib/wird";

/**
 * App data as the server sends it, mirroring the D1 tables
 * (staff, groups, members, records, marks), limited to what the signed-in user may see.
 */

export type Role = "supervisor" | "manager";

export interface Staff {
  id: string;
  name: string;
  role: Role;
  email: string;
  linked: boolean; // has signed in at least once
  main?: boolean; // a main supervisor from SUPERVISOR_EMAILS, who can't be removed in the app
}

/** Who a group's members are; it only changes the wording about them */
export type Audience = "girls" | "boys";

export interface Group {
  id: string;
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
  me: Staff;
  staff: Staff[]; // everyone for a supervisor (supervisors and managers), herself for a manager
  groups: Group[];
  members: Member[]; // array order is the numbering order within each group
  records: WirdRecord[];
  marks: Mark[];
}

/** Main supervisors are not stored in D1; each gets this id from her email */
export function mainSupervisorId(email: string): string {
  return `main:${email}`;
}

/** A person can be removed unless she is a main supervisor or the last supervisor */
export function canRemoveStaff(data: Data, person: Staff): boolean {
  if (person.main) return false;
  if (person.role !== "supervisor") return true;
  return data.staff.filter((s) => s.role === "supervisor").length > 1;
}

export function canSeeGroup(user: Staff, group: Group): boolean {
  return user.role === "supervisor" || group.managerId === user.id;
}

/** Adding, editing, reordering and removing members: the group's manager, or the supervisor anywhere */
export function canManageMembers(user: Staff, group: Group): boolean {
  return canSeeGroup(user, group);
}

export function visibleGroups(data: Data): Group[] {
  return data.groups.filter((g) => canSeeGroup(data.me, g));
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
