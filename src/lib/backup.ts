import type { Strings } from "@/components/ui";
import {
  type Data,
  type Group,
  groupMembers,
  hasMark,
  type MarkKind,
  personName,
} from "@/lib/store";
import { dayView, khatmat, recordPages } from "@/lib/wird";
import { type Cell, type Sheet, xlsx } from "@/lib/xlsx";

/**
 * A backup of some groups as an Excel file: one summary row per member, and one row per member per day
 * (reading and Kahf/Mulk marks).
 * Built in the browser from the data the server already sent her, so it can only hold what she may see.
 */
export function backupFile(t: Strings, data: Data, groups: Group[], today: string): Blob {
  const members = groups.flatMap((g) => groupMembers(data, g.id).map((m) => ({ g, m })));
  const byId = new Map(members.map((x) => [x.m.id, x]));

  const membersSheet: Sheet = {
    name: t["backup.sheet_members"],
    rows: [
      [
        t["backup.group"],
        t["backup.audience"],
        t["groups.manager"],
        t["form.name"],
        t["backup.daily"],
        t["form.start"],
        t["backup.current_page"],
        t["backup.khatmat"],
      ],
      ...groups.flatMap((g): Cell[][] => {
        const own = members.filter((x) => x.g.id === g.id);
        const head = [g.name, t[`audience.${g.audience}`], personName(data, g.managerId) ?? ""];
        // A group without members still gets a row, so every group is in the backup
        if (own.length === 0) return [[...head, null, null, null, null, null]];
        return own.map(({ m }) => [
          ...head,
          m.name,
          m.daily,
          m.startPage,
          dayView(m, data.records, today).page,
          khatmat(m, data.records),
        ]);
      }),
    ],
  };

  // One row per member per day: every day with a reading or a Kahf/Mulk mark
  const days = new Map<string, { memberId: string; date: string }>();
  for (const x of [...data.records, ...data.marks]) {
    if (byId.has(x.memberId))
      days.set(`${x.memberId} ${x.date}`, { memberId: x.memberId, date: x.date });
  }
  const readingsSheet: Sheet = {
    name: t["backup.sheet_readings"],
    rows: [
      [
        t["backup.group"],
        t["form.name"],
        t["backup.date"],
        t["backup.value"],
        t["backup.pages"],
        t["marks.kahf"],
        t["marks.mulk"],
      ],
      ...[...days.values()]
        .sort((a, b) => a.date.localeCompare(b.date))
        .flatMap(({ memberId, date }): Cell[][] => {
          const x = byId.get(memberId);
          if (!x) return [];
          const r = data.records.find((rec) => rec.memberId === memberId && rec.date === date);
          const tick = (kind: MarkKind) => (hasMark(data.marks, memberId, date, kind) ? "✓" : null);
          return [
            [
              x.g.name,
              x.m.name,
              date,
              r ? r.value : null,
              r ? recordPages(r) : null,
              tick("kahf"),
              tick("mulk"),
            ],
          ];
        }),
    ],
  };

  return xlsx([membersSheet, readingsSheet]);
}

/** Save the backup on her device */
export function downloadBackup(
  t: Strings,
  data: Data,
  groups: Group[],
  title: string,
  today: string,
) {
  const url = URL.createObjectURL(backupFile(t, data, groups, today));
  const a = document.createElement("a");
  a.href = url;
  // Keep letters (Arabic included), digits and dashes, so the name is safe on every phone
  a.download = `${t["backup.file_prefix"]}-${title.replace(/[^\p{L}\p{N}]+/gu, "-")}-${today}.xlsx`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
