import type { Op } from "@/lib/ops";
import {
  type Data,
  type Group,
  INITIATIVE_LIMIT,
  type Initiative,
  type InitiativeSummary,
  type Mark,
  type Person,
} from "@/lib/store";
import type { Member, WirdRecord } from "@/lib/wird";

/**
 * Server-only D1 access and permission checks.
 *
 * Who may do what:
 * - App admins (SUPERVISOR_EMAILS) see every initiative's name, supervisors and counts, and can suspend or
 *   delete it. They see nothing inside an initiative unless they supervise it or manage one of its groups.
 * - A supervisor of an initiative sees and changes all of it: its name, its groups, their managers,
 *   its supervisors. App admins can also rename any initiative.
 * - A manager sees and changes only her own groups.
 * - Nobody sees or changes anything in a suspended initiative.
 */

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type SignedInUser = NonNullable<App.Locals["user"]>;

/** The signed-in user as the server knows her */
export interface Actor {
  staffId: string | null; // null until she is invited or creates an initiative
  name: string;
  email: string;
  admin: boolean;
  userId: string | null; // her Hasanat account id, or null on a preview
}

/** Ids that src/lib/preview-auth.ts gives users signed in on a Hasanat preview */
const PREVIEW_ID_PREFIX = "preview:";

/** The app admins; the setting keeps its old name so hosting needs no change */
export function adminEmails(env: Env): string[] {
  return (env.SUPERVISOR_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Who the signed-in user is in this app. Someone added by email is linked to her Hasanat account
 * the first time she signs in with it. Preview sign-ins (src/lib/preview-auth.ts) match by email
 * and never link a row, so a preview sharing the production database could not tie a row to an id
 * that production never sees.
 */
export async function getActor(db: D1Database, env: Env, user: SignedInUser): Promise<Actor> {
  const email = (user.email ?? "").trim().toLowerCase();
  const preview = user.id.startsWith(PREVIEW_ID_PREFIX);
  type Row = { id: string; name: string; user_id: string | null };
  const row = preview
    ? await db
        .prepare("SELECT id, name, user_id FROM staff WHERE email = ?")
        .bind(email)
        .first<Row>()
    : await db
        .prepare(
          // A row linked to a preview id counts as unlinked, so her real account takes it over
          `SELECT id, name, user_id FROM staff
           WHERE user_id = ?1
              OR ((user_id IS NULL OR user_id LIKE '${PREVIEW_ID_PREFIX}%') AND email = ?2 AND ?2 <> '')
           ORDER BY user_id = ?1 DESC LIMIT 1`,
        )
        .bind(user.id, email)
        .first<Row>();
  if (row && !preview && row.user_id !== user.id) {
    await db.prepare("UPDATE staff SET user_id = ? WHERE id = ?").bind(user.id, row.id).run();
  }
  const actor: Actor = {
    staffId: row?.id ?? null,
    name: row?.name ?? (user.name || email),
    email,
    admin: email !== "" && adminEmails(env).includes(email),
    userId: preview ? null : user.id,
  };
  if (actor.admin) await adoptAsAdmin(db, actor);
  return actor;
}

/**
 * The initiative made from the data that existed before initiatives waits for an app admin:
 * the first one to sign in becomes its supervisor. Claiming clears the flag in the same statement.
 */
async function adoptAsAdmin(db: D1Database, actor: Actor) {
  const { results } = await db
    .prepare("UPDATE initiatives SET adopt_admin = 0 WHERE adopt_admin = 1 RETURNING id")
    .all<{ id: string }>();
  if (results.length === 0) return;
  const staffId = await ensureStaff(db, actor);
  await db.batch(
    results.map((r) =>
      db
        .prepare(
          "INSERT OR IGNORE INTO initiative_supervisors (initiative_id, staff_id) VALUES (?, ?)",
        )
        .bind(r.id, staffId),
    ),
  );
}

/** Her staff row, added the first time she needs one */
async function ensureStaff(db: D1Database, actor: Actor): Promise<string> {
  if (actor.staffId) return actor.staffId;
  const id = crypto.randomUUID();
  await db
    .prepare("INSERT INTO staff (id, name, email, user_id) VALUES (?, ?, ?, ?)")
    .bind(id, actor.name, actor.email, actor.userId)
    .run();
  actor.staffId = id;
  return id;
}

/** Someone a supervisor names by email: her existing row, or a new one that links when she signs in */
async function findOrAddPerson(db: D1Database, person: { name: string; email: string }) {
  await db
    .prepare("INSERT INTO staff (id, name, email) VALUES (?, ?, ?) ON CONFLICT (email) DO NOTHING")
    .bind(crypto.randomUUID(), person.name, person.email)
    .run();
  const row = await db
    .prepare("SELECT id FROM staff WHERE email = ?")
    .bind(person.email)
    .first<{ id: string }>();
  if (!row) throw new Error("person not saved");
  return row.id;
}

/** Forget people who no longer supervise an initiative or manage a group */
async function prune(db: D1Database, ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return;
  await db.batch(
    unique.map((id) =>
      db
        .prepare(
          `DELETE FROM staff WHERE id = ?1
             AND NOT EXISTS (SELECT 1 FROM initiative_supervisors WHERE staff_id = ?1)
             AND NOT EXISTS (SELECT 1 FROM groups WHERE manager_id = ?1)`,
        )
        .bind(id),
    ),
  );
}

/**
 * ?1 is her staff id. sup: the active initiatives she supervises.
 * vg: the groups she may open, in active initiatives only.
 */
const VISIBLE = `WITH
  sup AS (
    SELECT s.initiative_id FROM initiative_supervisors s
    JOIN initiatives i ON i.id = s.initiative_id
    WHERE s.staff_id = ?1 AND i.status = 'active'
  ),
  vg AS (
    SELECT g.* FROM groups g JOIN initiatives i ON i.id = g.initiative_id
    WHERE i.status = 'active' AND (g.manager_id = ?1 OR g.initiative_id IN (SELECT initiative_id FROM sup))
  )`;

export async function loadData(db: D1Database, actor: Actor): Promise<Data> {
  const me = {
    staffId: actor.staffId,
    name: actor.name,
    email: actor.email,
    admin: actor.admin,
    canCreate: true,
  };
  const empty = { initiatives: [], people: [], groups: [], members: [], records: [], marks: [] };
  if (!actor.staffId) return { me, ...empty };

  const q = (sql: string) => db.prepare(`${VISIBLE} ${sql}`).bind(actor.staffId);
  const [initiatives, links, people, groups, members, records, marks, created] = await db.batch([
    q(
      `SELECT i.id, i.name, i.status,
         EXISTS (SELECT 1 FROM initiative_supervisors s WHERE s.initiative_id = i.id AND s.staff_id = ?1) AS sup
       FROM initiatives i
       WHERE EXISTS (SELECT 1 FROM initiative_supervisors s WHERE s.initiative_id = i.id AND s.staff_id = ?1)
          OR EXISTS (SELECT 1 FROM groups g WHERE g.initiative_id = i.id AND g.manager_id = ?1)
       ORDER BY i.created_at`,
    ),
    q(
      `SELECT initiative_id, staff_id FROM initiative_supervisors
       WHERE initiative_id IN (SELECT initiative_id FROM sup) ORDER BY created_at`,
    ),
    q(
      `SELECT id, name, email, user_id IS NOT NULL AS linked FROM staff
       WHERE id = ?1
          OR id IN (SELECT staff_id FROM initiative_supervisors WHERE initiative_id IN (SELECT initiative_id FROM sup))
          OR id IN (SELECT manager_id FROM groups WHERE initiative_id IN (SELECT initiative_id FROM sup))
       ORDER BY created_at`,
    ),
    q("SELECT id, initiative_id, name, manager_id, audience FROM vg ORDER BY created_at"),
    q(
      `SELECT m.id, m.group_id, m.name, m.daily, m.start_page FROM members m
       JOIN vg ON vg.id = m.group_id ORDER BY m.group_id, m.position, m.created_at`,
    ),
    q(
      `SELECT r.member_id, r.date, r.value, r.daily FROM records r
       JOIN members m ON m.id = r.member_id JOIN vg ON vg.id = m.group_id ORDER BY r.date`,
    ),
    q(
      `SELECT k.member_id, k.date, k.kind FROM marks k
       JOIN members m ON m.id = k.member_id JOIN vg ON vg.id = m.group_id`,
    ),
    q("SELECT COUNT(*) AS n FROM initiatives WHERE created_by = ?1"),
  ]);

  type Row = Record<string, unknown>;
  const rows = (r: D1Result) => (r.results ?? []) as Row[];
  const supervisorIds = (initiativeId: string) =>
    rows(links)
      .filter((l) => l.initiative_id === initiativeId)
      .map((l) => String(l.staff_id));

  return {
    me: { ...me, canCreate: actor.admin || Number(rows(created)[0]?.n ?? 0) < INITIATIVE_LIMIT },
    initiatives: rows(initiatives).map(
      (i): Initiative => ({
        id: String(i.id),
        name: String(i.name),
        role: i.sup ? "supervisor" : "manager",
        suspended: i.status !== "active",
        supervisorIds: supervisorIds(String(i.id)),
      }),
    ),
    people: rows(people).map(
      (p): Person => ({
        id: String(p.id),
        name: String(p.name),
        email: String(p.email),
        linked: Boolean(p.linked),
      }),
    ),
    groups: rows(groups).map(
      (g): Group => ({
        id: String(g.id),
        initiativeId: String(g.initiative_id),
        name: String(g.name),
        managerId: g.manager_id ? String(g.manager_id) : null,
        audience: g.audience === "boys" ? "boys" : "girls",
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

/** Every initiative as app admins see it: no member names or reading records */
export async function loadSummaries(db: D1Database, actor: Actor): Promise<InitiativeSummary[]> {
  requireAdmin(actor);
  const [initiatives, supervisors] = await db.batch([
    db.prepare(
      `SELECT i.id, i.name, i.status,
         (SELECT COUNT(*) FROM groups g WHERE g.initiative_id = i.id) AS groups,
         (SELECT COUNT(*) FROM members m JOIN groups g ON g.id = m.group_id
          WHERE g.initiative_id = i.id) AS members
       FROM initiatives i ORDER BY i.created_at`,
    ),
    db.prepare(
      `SELECT s.initiative_id, p.name, p.email FROM initiative_supervisors s
       JOIN staff p ON p.id = s.staff_id ORDER BY s.created_at`,
    ),
  ]);
  type Row = Record<string, unknown>;
  const rows = (r: D1Result) => (r.results ?? []) as Row[];
  return rows(initiatives).map((i) => ({
    id: String(i.id),
    name: String(i.name),
    suspended: i.status !== "active",
    supervisors: rows(supervisors)
      .filter((s) => s.initiative_id === i.id)
      .map((s) => ({ name: String(s.name), email: String(s.email) })),
    groups: Number(i.groups),
    members: Number(i.members),
  }));
}

function requireAdmin(actor: Actor) {
  if (!actor.admin) throw new HttpError(403, "app admins only");
}

/** She supervises this initiative, and it is active */
async function requireSupervisorOf(db: D1Database, actor: Actor, initiativeId: string) {
  const row = await db
    .prepare(
      `SELECT 1 FROM initiatives i JOIN initiative_supervisors s ON s.initiative_id = i.id
       WHERE i.id = ? AND s.staff_id = ? AND i.status = 'active'`,
    )
    .bind(initiativeId, actor.staffId)
    .first();
  if (!row) throw new HttpError(403, "not your initiative");
}

/** She supervises the group's initiative or manages the group, and the initiative is active */
async function requireGroup(db: D1Database, actor: Actor, groupId: string) {
  const row = await db
    .prepare(
      `SELECT 1 FROM groups g JOIN initiatives i ON i.id = g.initiative_id
       WHERE g.id = ?1 AND i.status = 'active' AND (g.manager_id = ?2 OR EXISTS (
         SELECT 1 FROM initiative_supervisors s WHERE s.initiative_id = g.initiative_id AND s.staff_id = ?2))`,
    )
    .bind(groupId, actor.staffId)
    .first();
  // Missing and not hers look the same, so ids from other initiatives reveal nothing
  if (!row) throw new HttpError(403, "not your group");
}

async function requireMember(db: D1Database, actor: Actor, memberId: string): Promise<string> {
  const member = await db
    .prepare("SELECT group_id FROM members WHERE id = ?")
    .bind(memberId)
    .first<{ group_id: string }>();
  if (!member) throw new HttpError(403, "not your group");
  await requireGroup(db, actor, member.group_id);
  return member.group_id;
}

export async function runOp(db: D1Database, actor: Actor, op: Op): Promise<void> {
  switch (op.type) {
    case "recordSet":
      await requireMember(db, actor, op.memberId);
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
      await requireMember(db, actor, op.memberId);
      await db
        .prepare("DELETE FROM records WHERE member_id = ? AND date = ?")
        .bind(op.memberId, op.date)
        .run();
      return;
    case "markSet":
      await requireMember(db, actor, op.memberId);
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
      await requireGroup(db, actor, op.groupId);
      await db
        .prepare(
          `INSERT INTO members (id, group_id, name, daily, start_page, position)
           SELECT ?1, ?2, ?3, ?4, ?5, COALESCE(MAX(position), 0) + 1 FROM members WHERE group_id = ?2`,
        )
        .bind(op.id, op.groupId, op.name, op.daily, op.startPage)
        .run();
      return;
    case "memberUpdate":
      await requireMember(db, actor, op.id);
      await db
        .prepare("UPDATE members SET name = ?, daily = ?, start_page = ? WHERE id = ?")
        .bind(op.name, op.daily, op.startPage, op.id)
        .run();
      return;
    case "memberRemove":
      await requireMember(db, actor, op.id);
      await db.prepare("DELETE FROM members WHERE id = ?").bind(op.id).run();
      return;
    case "memberMove": {
      const groupId = await requireMember(db, actor, op.id);
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
    case "groupSave": {
      await requireSupervisorOf(db, actor, op.initiativeId);
      const old = await db
        .prepare("SELECT initiative_id, manager_id FROM groups WHERE id = ?")
        .bind(op.id)
        .first<{ initiative_id: string; manager_id: string | null }>();
      if (old && old.initiative_id !== op.initiativeId) throw new HttpError(403, "not your group");
      const managerId = op.manager ? await findOrAddPerson(db, op.manager) : null;
      // The WHERE keeps an existing group in its initiative even if two saves race
      await db
        .prepare(
          `INSERT INTO groups (id, initiative_id, name, manager_id, audience) VALUES (?1, ?2, ?3, ?4, ?5)
           ON CONFLICT (id) DO UPDATE SET
             name = excluded.name, manager_id = excluded.manager_id, audience = excluded.audience
           WHERE groups.initiative_id = excluded.initiative_id`,
        )
        .bind(op.id, op.initiativeId, op.name, managerId, op.audience)
        .run();
      if (old?.manager_id !== managerId) await prune(db, [old?.manager_id]);
      return;
    }
    case "groupRemove": {
      const group = await db
        .prepare("SELECT initiative_id, manager_id FROM groups WHERE id = ?")
        .bind(op.id)
        .first<{ initiative_id: string; manager_id: string | null }>();
      if (!group) throw new HttpError(403, "not your group");
      await requireSupervisorOf(db, actor, group.initiative_id);
      await db.prepare("DELETE FROM groups WHERE id = ?").bind(op.id).run();
      await prune(db, [group.manager_id]);
      return;
    }
    case "initiativeCreate": {
      const staffId = await ensureStaff(db, actor);
      // One statement checks the limit and adds it, so quick repeats can't pass the limit
      const { meta } = await db
        .prepare(
          `INSERT INTO initiatives (id, name, created_by)
           SELECT ?1, ?2, ?3 WHERE ?4 = 1 OR (SELECT COUNT(*) FROM initiatives WHERE created_by = ?3) < ?5
           ON CONFLICT (id) DO NOTHING`,
        )
        .bind(op.id, op.name, staffId, actor.admin ? 1 : 0, INITIATIVE_LIMIT)
        .run();
      if (meta.changes === 0) {
        const exists = await db
          .prepare("SELECT 1 FROM initiatives WHERE id = ?")
          .bind(op.id)
          .first();
        throw exists ? new HttpError(409, "id taken") : new HttpError(429, "initiative limit");
      }
      await db
        .prepare("INSERT INTO initiative_supervisors (initiative_id, staff_id) VALUES (?, ?)")
        .bind(op.id, staffId)
        .run();
      return;
    }
    case "initiativeRename": {
      if (!actor.admin) await requireSupervisorOf(db, actor, op.id);
      const { meta } = await db
        .prepare("UPDATE initiatives SET name = ? WHERE id = ?")
        .bind(op.name, op.id)
        .run();
      if (meta.changes === 0) throw new HttpError(404, "initiative not found");
      return;
    }
    case "supervisorAdd": {
      await requireSupervisorOf(db, actor, op.initiativeId);
      const personId = await findOrAddPerson(db, op);
      const { meta } = await db
        .prepare(
          "INSERT OR IGNORE INTO initiative_supervisors (initiative_id, staff_id) VALUES (?, ?)",
        )
        .bind(op.initiativeId, personId)
        .run();
      if (meta.changes === 0) throw new HttpError(409, "already a supervisor");
      return;
    }
    case "supervisorRemove": {
      await requireSupervisorOf(db, actor, op.initiativeId);
      // One statement, so two supervisors removing each other at once still leave one
      const { meta } = await db
        .prepare(
          `DELETE FROM initiative_supervisors WHERE initiative_id = ?1 AND staff_id = ?2
             AND (SELECT COUNT(*) FROM initiative_supervisors WHERE initiative_id = ?1) > 1`,
        )
        .bind(op.initiativeId, op.personId)
        .run();
      if (meta.changes === 0) throw new HttpError(403, "last supervisor or not a supervisor");
      await prune(db, [op.personId]);
      return;
    }
    case "initiativeSuspend": {
      requireAdmin(actor);
      const { meta } = await db
        .prepare("UPDATE initiatives SET status = ? WHERE id = ?")
        .bind(op.suspended ? "suspended" : "active", op.id)
        .run();
      if (meta.changes === 0) throw new HttpError(404, "initiative not found");
      return;
    }
    case "initiativeDelete": {
      requireAdmin(actor);
      const { results: people } = await db
        .prepare(
          `SELECT staff_id AS id FROM initiative_supervisors WHERE initiative_id = ?1
           UNION SELECT manager_id FROM groups WHERE initiative_id = ?1 AND manager_id IS NOT NULL`,
        )
        .bind(op.id)
        .all<{ id: string }>();
      // Groups, members, records and marks go with it (ON DELETE CASCADE)
      const { meta } = await db
        .prepare("DELETE FROM initiatives WHERE id = ? AND name = ?")
        .bind(op.id, op.name)
        .run();
      if (meta.changes === 0) throw new HttpError(400, "name does not match");
      await prune(
        db,
        people.map((p) => p.id),
      );
      return;
    }
  }
}
