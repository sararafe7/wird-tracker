import { z } from "zod";
import { type Data, moveMember, setMark, withoutMembers } from "@/lib/store";
import { removeRecord, setRecord, TOTAL_PAGES } from "@/lib/wird";

/**
 * Every change the app can make. The server validates it with opSchema, checks permissions,
 * and writes it to D1. Daily changes the client also applies at once with applyOp;
 * changes to initiatives, groups and supervisors it sends and then reloads (see reloadsAfter).
 */

const id = z.string().min(1).max(64);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const name = z.string().trim().min(1).max(80);
const page = z.number().int().min(1).max(TOTAL_PAGES);
const email = z.string().trim().toLowerCase().email().max(254);
/** Someone named by the supervisor; the server finds her by email or adds her */
const person = z.object({ name, email });

export const opSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("recordSet"),
    memberId: id,
    date,
    value: z.number().min(0).max(100),
  }),
  z.object({ type: z.literal("recordRemove"), memberId: id, date }),
  z.object({
    type: z.literal("markSet"),
    memberId: id,
    date,
    kind: z.enum(["kahf", "mulk"]),
    on: z.boolean(),
  }),
  z.object({
    type: z.literal("memberAdd"),
    id,
    groupId: id,
    name,
    daily: page,
    startPage: page,
  }),
  z.object({ type: z.literal("memberUpdate"), id, name, daily: page, startPage: page }),
  z.object({ type: z.literal("memberRemove"), id }),
  z.object({ type: z.literal("memberMove"), id, dir: z.union([z.literal(-1), z.literal(1)]) }),
  z.object({
    type: z.literal("groupSave"),
    id,
    initiativeId: id,
    name,
    manager: person.nullable(),
    audience: z.enum(["girls", "boys"]),
  }),
  z.object({ type: z.literal("groupRemove"), id }),
  z.object({ type: z.literal("initiativeCreate"), id, name }),
  z.object({ type: z.literal("supervisorAdd"), initiativeId: id, ...person.shape }),
  z.object({ type: z.literal("supervisorRemove"), initiativeId: id, personId: id }),
  // App admins only
  z.object({ type: z.literal("initiativeSuspend"), id, suspended: z.boolean() }),
  // The typed name must match, so a wrong id can't delete the wrong initiative
  z.object({ type: z.literal("initiativeDelete"), id, name }),
]);

export type Op = z.infer<typeof opSchema>;

/** Changes applyOp shows at once; for every other change the client waits for the server, then reloads */
const INSTANT = new Set<Op["type"]>([
  "recordSet",
  "recordRemove",
  "markSet",
  "memberAdd",
  "memberUpdate",
  "memberRemove",
  "memberMove",
  "groupRemove",
]);

export function reloadsAfter(op: Op): boolean {
  return !INSTANT.has(op.type);
}

/** The client-side effect of an op, matching what the server writes */
export function applyOp(data: Data, op: Op): Data {
  switch (op.type) {
    case "recordSet": {
      const member = data.members.find((m) => m.id === op.memberId);
      if (!member) return data;
      return { ...data, records: setRecord(data.records, member, op.date, op.value) };
    }
    case "recordRemove":
      return { ...data, records: removeRecord(data.records, op.memberId, op.date) };
    case "markSet":
      return { ...data, marks: setMark(data.marks, op.memberId, op.date, op.kind, op.on) };
    case "memberAdd":
      return {
        ...data,
        members: [
          ...data.members,
          {
            id: op.id,
            groupId: op.groupId,
            name: op.name,
            daily: op.daily,
            startPage: op.startPage,
          },
        ],
      };
    case "memberUpdate":
      return {
        ...data,
        members: data.members.map((m) =>
          m.id === op.id ? { ...m, name: op.name, daily: op.daily, startPage: op.startPage } : m,
        ),
      };
    case "memberRemove":
      return withoutMembers(data, new Set([op.id]));
    case "memberMove":
      return { ...data, members: moveMember(data.members, op.id, op.dir) };
    case "groupRemove": {
      const gone = new Set(data.members.filter((m) => m.groupId === op.id).map((m) => m.id));
      return { ...withoutMembers(data, gone), groups: data.groups.filter((g) => g.id !== op.id) };
    }
    default:
      return data;
  }
}
