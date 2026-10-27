import { reportError } from "@/lib/errors";
import { newId } from "@/lib/id";
import type { Member, WirdRecord } from "@/lib/wird";

/**
 * Local data store. The shapes mirror the planned D1 tables
 * (staff, groups, members, records, marks) so the move online is a storage swap.
 */

export type Role = "supervisor" | "manager";

export interface Staff {
  id: string;
  name: string;
  role: Role;
}

export interface Group {
  id: string;
  name: string;
  managerId: string | null;
}

export type MarkKind = "kahf" | "mulk";

/** A surah read on a day, shown as a flower in the group table */
export interface Mark {
  memberId: string;
  date: string;
  kind: MarkKind;
}

export interface Data {
  staff: Staff[];
  groups: Group[];
  members: Member[]; // array order is the numbering order within each group
  records: WirdRecord[];
  marks: Mark[];
  actingAs: string; // local stand-in for the signed-in user until shared sign-in
}

const STORAGE_KEY = "wird.data.v3";
const V2_KEY = "wird.data.v2";

const SUPERVISOR: Staff = { id: "supervisor", name: "المشرفة", role: "supervisor" };

export function emptyData(): Data {
  return {
    staff: [SUPERVISOR],
    groups: [],
    members: [],
    records: [],
    marks: [],
    actingAs: SUPERVISOR.id,
  };
}

type V2Member = Omit<Member, "groupId">;

/** Earlier single-group data becomes one group with its own manager */
function fromV2(raw: string): Data {
  const v2 = JSON.parse(raw) as { members: V2Member[]; records: WirdRecord[] };
  const data = emptyData();
  if (v2.members.length === 0) return data;
  const manager: Staff = { id: newId(), name: "المسؤولة", role: "manager" };
  const group: Group = { id: newId(), name: "مجموعتي", managerId: manager.id };
  return {
    ...data,
    staff: [...data.staff, manager],
    groups: [group],
    members: v2.members.map((m) => ({ ...m, groupId: group.id })),
    records: v2.records,
    actingAs: manager.id,
  };
}

export function load(): Data {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...emptyData(), ...(JSON.parse(raw) as Partial<Data>) };
    const v2 = localStorage.getItem(V2_KEY);
    if (!v2) return emptyData();
    // Save at once so the generated group and manager ids stay stable across reloads
    const migrated = fromV2(v2);
    save(migrated);
    return migrated;
  } catch (error) {
    reportError("load", error);
    // Keep the unreadable data aside so the next save cannot destroy it
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) localStorage.setItem(`${STORAGE_KEY}.unreadable`, raw);
    } catch {
      // Storage itself is unavailable; already reported above
    }
    return emptyData();
  }
}

/** Returns false (after reporting) when the browser refuses to store the data */
export function save(data: Data): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    reportError("save", error);
    return false;
  }
}

export function currentUser(data: Data): Staff {
  return data.staff.find((s) => s.id === data.actingAs) ?? SUPERVISOR;
}

export function canSeeGroup(user: Staff, group: Group): boolean {
  return user.role === "supervisor" || group.managerId === user.id;
}

/** Adding, editing, reordering and removing members: the group's manager, or the supervisor anywhere */
export function canManageMembers(user: Staff, group: Group): boolean {
  return canSeeGroup(user, group);
}

export function visibleGroups(data: Data): Group[] {
  const user = currentUser(data);
  return data.groups.filter((g) => canSeeGroup(user, g));
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

export function toggleMark(marks: Mark[], memberId: string, date: string, kind: MarkKind): Mark[] {
  return hasMark(marks, memberId, date, kind)
    ? marks.filter((k) => !(k.memberId === memberId && k.date === date && k.kind === kind))
    : [...marks, { memberId, date, kind }];
}

/** Remove a group with its members and their history */
export function deleteGroup(data: Data, groupId: string): Data {
  const gone = new Set(groupMembers(data, groupId).map((m) => m.id));
  return {
    ...data,
    groups: data.groups.filter((g) => g.id !== groupId),
    members: data.members.filter((m) => !gone.has(m.id)),
    records: data.records.filter((r) => !gone.has(r.memberId)),
    marks: data.marks.filter((k) => !gone.has(k.memberId)),
  };
}
