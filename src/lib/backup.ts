import type { Strings } from "@/components/ui";
import { type Data, type Group, groupMembers, personName } from "@/lib/store";
import { dayView, khatmat, recordPages } from "@/lib/wird";
import { type Cell, type Sheet, xlsx } from "@/lib/xlsx";

/**
 * A backup of some groups as an Excel file: members, readings, and Kahf/Mulk marks.
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

  const readingsSheet: Sheet = {
    name: t["backup.sheet_readings"],
    rows: [
      [t["backup.group"], t["form.name"], t["backup.date"], t["backup.value"], t["backup.pages"]],
      ...[...data.records]
        .sort((a, b) => a.date.localeCompare(b.date))
        .flatMap((r): Cell[][] => {
          const x = byId.get(r.memberId);
          return x ? [[x.g.name, x.m.name, r.date, r.value, recordPages(r)]] : [];
        }),
    ],
  };

  const marksSheet: Sheet = {
    name: t["backup.sheet_marks"],
    rows: [
      [t["backup.group"], t["form.name"], t["backup.date"], t["backup.surah"]],
      ...[...data.marks]
        .sort((a, b) => a.date.localeCompare(b.date))
        .flatMap((k): Cell[][] => {
          const x = byId.get(k.memberId);
          return x ? [[x.g.name, x.m.name, k.date, t[`marks.${k.kind}`]]] : [];
        }),
    ],
  };

  return xlsx([membersSheet, readingsSheet, marksSheet]);
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
