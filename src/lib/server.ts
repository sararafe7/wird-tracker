import type { Op } from "@/lib/ops";
import { type Data, type Group, type Mark, type Staff, SUPERVISOR_ID } from "@/lib/store";
import type { Member, WirdRecord } from "@/lib/wird";

/** Server-only D1 access and permission checks */

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type SignedInUser = NonNullable<App.Locals["user"]>;

export function supervisorEmails(env: Env): string[] {
  return (env.SUPERVISOR_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Who the signed-in user is in this app, or null when nobody has added her.
 * A manager's Hasanat account is linked to her staff row the first time she signs in with its email.
 */
export async function getActor(
  db: D1Database,
  env: Env,
  user: SignedInUser,
): Promise<Staff | null> {
  const email = (user.email ?? "").trim().toLowerCase();
  if (email && supervisorEmails(env).includes(email)) {
    return { id: SUPERVISOR_ID, name: user.name || email, role: "supervisor", email, linked: true };
  }
  const row = await db
    .prepare(
      `SELECT id, name, email, user_id FROM staff
       WHERE user_id = ?1 OR (user_id IS NULL AND email = ?2 AND ?2 <> '')
       ORDER BY user_id IS NULL LIMIT 1`,
    )
    .bind(user.id, email)
    .first<{ id: string; name: string; email: string; user_id: string | null }>();
  if (!row) return null;
  if (!row.user_id) {
    await db.prepare("UPDATE staff SET user_id = ? WHERE id = ?").bind(user.id, row.id).run();
  }
  return { id: row.id, name: row.name, role: "manager", email: row.email, linked: true };
}

export async function loadData(db: D1Database, me: Staff): Promise<Data> {
  const sup = me.role === "supervisor";
  // Managers only get rows from their own groups
  const groupFilter = sup ? "" : "WHERE g.manager_id = ?1";
  const bind = (sql: string) => (sup ? db.prepare(sql) : db.prepare(sql).bind(me.id));

  const [staff, groups, members, records, marks] = await db.batch([
    sup
      ? db.prepare(
          "SELECT id, name, email, user_id IS NOT NULL AS linked FROM staff ORDER BY created_at",
        )
      : db.prepare("SELECT id, name, email, 1 AS linked FROM staff WHERE id = ?1").bind(me.id),
    bind(`SELECT g.id, g.name, g.manager_id FROM groups g ${groupFilter} ORDER BY g.created_at`),
    bind(
      `SELECT m.id, m.group_id, m.name, m.daily, m.start_page FROM members m
       JOIN groups g ON g.id = m.group_id ${groupFilter}
       ORDER BY m.group_id, m.position, m.created_at`,
    ),
    bind(
      `SELECT r.member_id, r.date, r.value, r.daily FROM records r
       JOIN members m ON m.id = r.member_id JOIN groups g ON g.id = m.group_id ${groupFilter}
       ORDER BY r.date`,
    ),
    bind(
      `SELECT k.member_id, k.date, k.kind FROM marks k
       JOIN members m ON m.id = k.member_id JOIN groups g ON g.id = m.group_id ${groupFilter}`,
    ),
  ]);

  type Row = Record<string, unknown>;
  const rows = (r: D1Result) => (r.results ?? []) as Row[];
  const staffList: Staff[] = rows(staff).map((s) => ({
    id: String(s.id),
    name: String(s.name),
    role: "manager",
    email: String(s.email),
    linked: Boolean(s.linked),
  }));

  return {
    me,
    staff: sup ? [me, ...staffList] : staffList,
    groups: rows(groups).map(
      (g): Group => ({
        id: String(g.id),
        name: String(g.name),
        managerId: g.manager_id ? String(g.manager_id) : null,
      }),
    ),
    members: rows(members).map(
      (m): Member => ({
        id: String(m.id),
        groupId: String(m.group_id),
        name: String(m.name),
        daily: Number(m.daily),
        startPage: Number(m.start_page),
      }),
    ),
    records: rows(records).map(
      (r): WirdRecord => ({
        memberId: String(r.member_id),
        date: String(r.date),
        value: Number(r.value),
        daily: Number(r.daily),
      }),
    ),
    marks: rows(marks).map(
      (k): Mark => ({
        memberId: String(k.member_id),
        date: String(k.date),
        kind: k.kind === "mulk" ? "mulk" : "kahf",
      }),
    ),
  };
}

async function requireGroup(db: D1Database, me: Staff, groupId: string) {
  const group = await db
    .prepare("SELECT manager_id FROM groups WHERE id = ?")
    .bind(groupId)
    .first<{ manager_id: string | null }>();
  if (!group) throw new HttpError(404, "group not found");
  if (me.role !== "supervisor" && group.manager_id !== me.id) {
    throw new HttpError(403, "not your group");
  }
}

async function requireMember(db: D1Database, me: Staff, memberId: string): Promise<string> {
  const member = await db
    .prepare("SELECT group_id FROM members WHERE id = ?")
    .bind(memberId)
    .first<{ group_id: string }>();
  if (!member) throw new HttpError(404, "member not found");
  await requireGroup(db, me, member.group_id);
  return member.group_id;
}

function requireSupervisor(me: Staff) {
  if (me.role !== "supervisor") throw new HttpError(403, "supervisor only");
}

export async function runOp(db: D1Database, me: Staff, op: Op): Promise<void> {
  switch (op.type) {
    case "recordSet":
      await requireMember(db, me, op.memberId);
      // A new record snapshots her daily pages; changing the value keeps the snapshot
      await db
        .prepare(
          `INSERT INTO records (member_id, date, value, daily)
           SELECT id, ?2, ?3, daily FROM members WHERE id = ?1
           ON CONFLICT (member_id, date) DO UPDATE SET value = excluded.value`,
        )
        .bind(op.memberId, op.date, op.value)
        .run();
      return;
    case "recordRemove":
      await requireMember(db, me, op.memberId);
      await db
        .prepare("DELETE FROM records WHERE member_id = ? AND date = ?")
        .bind(op.memberId, op.date)
        .run();
      return;
    case "markSet":
      await requireMember(db, me, op.memberId);
      await db
        .prepare(
          op.on
            ? "INSERT OR IGNORE INTO marks (member_id, date, kind) VALUES (?, ?, ?)"
            : "DELETE FROM marks WHERE member_id = ? AND date = ? AND kind = ?",
        )
        .bind(op.memberId, op.date, op.kind)
        .run();
      return;
    case "memberAdd":
      await requireGroup(db, me, op.groupId);
      await db
        .prepare(
          `INSERT INTO members (id, group_id, name, daily, start_page, position)
           SELECT ?1, ?2, ?3, ?4, ?5, COALESCE(MAX(position), 0) + 1 FROM members WHERE group_id = ?2`,
        )
        .bind(op.id, op.groupId, op.name, op.daily, op.startPage)
        .run();
      return;
    case "memberUpdate":
      await requireMember(db, me, op.id);
      await db
        .prepare("UPDATE members SET name = ?, daily = ?, start_page = ? WHERE id = ?")
        .bind(op.name, op.daily, op.startPage, op.id)
        .run();
      return;
    case "memberRemove":
      await requireMember(db, me, op.id);
      await db.prepare("DELETE FROM members WHERE id = ?").bind(op.id).run();
      return;
    case "memberMove": {
      const groupId = await requireMember(db, me, op.id);
      const { results } = await db
        .prepare("SELECT id FROM members WHERE group_id = ? ORDER BY position, created_at")
        .bind(groupId)
        .all<{ id: string }>();
      const order = results.map((r) => r.id);
      const i = order.indexOf(op.id);
      const j = i + op.dir;
      if (j < 0 || j >= order.length) return;
      [order[i], order[j]] = [order[j], order[i]];
      // Renumber the whole group so positions stay unique and gap-free
      await db.batch(
        order.map((memberId, n) =>
          db.prepare("UPDATE members SET position = ? WHERE id = ?").bind(n + 1, memberId),
        ),
      );
      return;
    }
    case "groupSave":
      requireSupervisor(me);
      if (
        op.managerId &&
        !(await db.prepare("SELECT 1 FROM staff WHERE id = ?").bind(op.managerId).first())
      ) {
        throw new HttpError(400, "unknown manager");
      }
      await db
        .prepare(
          `INSERT INTO groups (id, name, manager_id) VALUES (?1, ?2, ?3)
           ON CONFLICT (id) DO UPDATE SET name = excluded.name, manager_id = excluded.manager_id`,
        )
        .bind(op.id, op.name, op.managerId)
        .run();
      return;
    case "groupRemove":
      requireSupervisor(me);
      await db.prepare("DELETE FROM groups WHERE id = ?").bind(op.id).run();
      return;
    case "staffAdd": {
      requireSupervisor(me);
      const taken = await db.prepare("SELECT 1 FROM staff WHERE email = ?").bind(op.email).first();
      if (taken) throw new HttpError(409, "email already added");
      await db
        .prepare("INSERT INTO staff (id, name, email) VALUES (?, ?, ?)")
        .bind(op.id, op.name, op.email)
        .run();
      return;
    }
    case "staffRemove":
      requireSupervisor(me);
      await db.prepare("DELETE FROM staff WHERE id = ?").bind(op.id).run();
      return;
  }
}
