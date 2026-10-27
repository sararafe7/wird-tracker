import { ChevronLeft, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import GroupBoard from "@/components/GroupBoard";
import GroupTable from "@/components/GroupTable";
import { fill, inputClass, type Strings } from "@/components/ui";
import { ERROR_EVENT, type ErrorKind, reportError } from "@/lib/errors";
import { newId } from "@/lib/id";
import {
  currentUser,
  type Data,
  deleteGroup,
  emptyData,
  type Group,
  groupMembers,
  load,
  type Staff,
  save,
  visibleGroups,
} from "@/lib/store";
import { dayView, wirdDate } from "@/lib/wird";
import { cn } from "@/utils/cn";

type Route = { view: "home" } | { view: "group" | "table"; groupId: string };

function parseHash(hash: string): Route {
  const m = hash.match(/^#\/g\/([^/]+)(\/table)?$/);
  if (!m) return { view: "home" };
  return { view: m[2] ? "table" : "group", groupId: decodeURIComponent(m[1]) };
}

function go(route: Route) {
  location.hash =
    route.view === "home" ? "" : `#/g/${route.groupId}${route.view === "table" ? "/table" : ""}`;
}

interface GroupForm {
  id?: string;
  name: string;
  managerId: string;
}

function Screens({ t }: { t: Strings }) {
  const [data, setData] = useState<Data>(emptyData);
  const [loaded, setLoaded] = useState(false);
  const [route, setRoute] = useState<Route>({ view: "home" });
  const [today, setToday] = useState(() => wirdDate());
  const [groupForm, setGroupForm] = useState<GroupForm | null>(null);
  const [managerName, setManagerName] = useState("");

  useEffect(() => {
    setData(load());
    setLoaded(true);
    setRoute(parseHash(location.hash));
    const onHash = () => setRoute(parseHash(location.hash));
    window.addEventListener("hashchange", onHash);
    // Keep "today" right if the page stays open across the day boundary
    const id = window.setInterval(() => setToday(wirdDate()), 60_000);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.clearInterval(id);
    };
  }, []);

  function update(next: Data) {
    setData(next);
    save(next);
  }

  if (!loaded) return <p className="text-stone-500">{t["common.loading"]}</p>;

  const user = currentUser(data);
  const groups = visibleGroups(data);
  const managers = data.staff.filter((s) => s.role === "manager");
  const isSupervisor = user.role === "supervisor";

  if (route.view !== "home") {
    const group = groups.find((g) => g.id === route.groupId);
    if (group && route.view === "table") {
      return (
        <GroupTable
          t={t}
          data={data}
          group={group}
          today={today}
          onClose={() => go({ view: "group", groupId: group.id })}
        />
      );
    }
    if (group) {
      return (
        <GroupBoard
          key={group.id}
          t={t}
          data={data}
          update={update}
          group={group}
          user={user}
          today={today}
          onBack={() => go({ view: "home" })}
          onTable={() => go({ view: "table", groupId: group.id })}
        />
      );
    }
  }

  function saveGroup(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!groupForm) return;
    const name = groupForm.name.trim();
    if (!name) return;
    const managerId = groupForm.managerId || null;
    const nextGroups = groupForm.id
      ? data.groups.map((g) => (g.id === groupForm.id ? { ...g, name, managerId } : g))
      : [...data.groups, { id: newId(), name, managerId }];
    update({ ...data, groups: nextGroups });
    setGroupForm(null);
  }

  function removeGroup(g: Group) {
    if (!confirm(fill(t["groups.delete_confirm"], { name: g.name }))) return;
    update(deleteGroup(data, g.id));
    setGroupForm(null);
  }

  function addManager(e: { preventDefault(): void }) {
    e.preventDefault();
    const name = managerName.trim();
    if (!name) return;
    update({ ...data, staff: [...data.staff, { id: newId(), name, role: "manager" }] });
    setManagerName("");
  }

  function removeManager(s: Staff) {
    if (!confirm(fill(t["staff.delete_confirm"], { name: s.name }))) return;
    update({
      ...data,
      staff: data.staff.filter((x) => x.id !== s.id),
      groups: data.groups.map((g) => (g.managerId === s.id ? { ...g, managerId: null } : g)),
    });
  }

  const nameOf = (id: string | null) => data.staff.find((s) => s.id === id)?.name;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="shrink-0 font-medium text-amber-900">{t["dev.acting_as"]}</span>
          <select
            value={user.id}
            onChange={(e) => update({ ...data, actingAs: e.target.value })}
            className={cn(inputClass, "py-1.5")}
          >
            {data.staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {t[`role.${s.role}`]}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-1 text-xs text-amber-800">{t["dev.note"]}</p>
      </div>

      <section className="space-y-3">
        <h1 className="text-2xl font-bold text-slate-900">
          {isSupervisor ? t["groups.all"] : t["groups.mine"]}
        </h1>
        {groups.length === 0 && (
          <p className="card text-stone-600">
            {isSupervisor ? t["groups.empty_supervisor"] : t["groups.empty_manager"]}
          </p>
        )}
        <ul className="space-y-2">
          {groups.map((g) => {
            const members = groupMembers(data, g.id);
            const done = members.filter((m) => dayView(m, data.records, today).record).length;
            return (
              <li
                key={g.id}
                className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white"
              >
                <a href={`#/g/${g.id}`} className="flex min-w-0 flex-1 items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{g.name}</p>
                    <p className="text-sm text-stone-500">
                      {nameOf(g.managerId) ?? t["groups.no_manager"]}
                      {" · "}
                      {fill(t["wird.progress"], { done, total: members.length })}
                    </p>
                  </div>
                  <ChevronLeft
                    className="h-5 w-5 shrink-0 text-stone-400 ltr:rotate-180"
                    aria-hidden="true"
                  />
                </a>
                {isSupervisor && (
                  <button
                    type="button"
                    onClick={() =>
                      setGroupForm({ id: g.id, name: g.name, managerId: g.managerId ?? "" })
                    }
                    aria-label={fill(t["wird.edit"], { name: g.name })}
                    className="me-2 rounded-lg p-2 text-stone-500 hover:bg-slate-50 hover:text-slate-700"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {isSupervisor && !groupForm && (
          <button
            type="button"
            className="btn-secondary w-full"
            onClick={() => setGroupForm({ name: "", managerId: managers[0]?.id ?? "" })}
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            {t["groups.add"]}
          </button>
        )}

        {isSupervisor && groupForm && (
          <form onSubmit={saveGroup} className="card space-y-4">
            <h2 className="text-lg font-semibold">
              {groupForm.id ? t["groups.edit_title"] : t["groups.add"]}
            </h2>
            <label className="block space-y-1">
              <span className="text-sm font-medium">{t["groups.name"]}</span>
              <input
                required
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">{t["groups.manager"]}</span>
              <select
                value={groupForm.managerId}
                onChange={(e) => setGroupForm({ ...groupForm, managerId: e.target.value })}
                className={inputClass}
              >
                <option value="">{t["groups.no_manager"]}</option>
                {managers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            {managers.length === 0 && (
              <p className="text-xs text-stone-500">{t["groups.add_manager_first"]}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn-primary flex-1">
                {t["common.save"]}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setGroupForm(null)}>
                {t["common.cancel"]}
              </button>
              {groupForm.id && (
                <button
                  type="button"
                  className="btn-secondary text-red-700"
                  aria-label={t["form.delete"]}
                  onClick={() => {
                    const g = data.groups.find((x) => x.id === groupForm.id);
                    if (g) removeGroup(g);
                  }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </form>
        )}
      </section>

      {isSupervisor && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">{t["staff.title"]}</h2>
          {managers.length > 0 && (
            <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white">
              {managers.map((s) => {
                const count = data.groups.filter((g) => g.managerId === s.id).length;
                return (
                  <li key={s.id} className="flex items-center justify-between gap-2 px-4 py-2">
                    <span className="min-w-0 truncate">
                      {s.name}
                      <span className="ms-2 text-xs text-stone-500">
                        {fill(t["staff.groups_count"], { n: count })}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeManager(s)}
                      aria-label={fill(t["staff.delete"], { name: s.name })}
                      className="rounded-lg p-2 text-stone-500 hover:bg-slate-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <form onSubmit={addManager} className="flex gap-2">
            <input
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              placeholder={t["staff.name_placeholder"]}
              aria-label={t["staff.name_placeholder"]}
              className={inputClass}
            />
            <button type="submit" className="btn-secondary shrink-0 !px-4">
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              {t["staff.add"]}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

/** Shows every reported or uncaught error in Arabic, above all screens including the table */
function ErrorBanner({ t }: { t: Strings }) {
  const [kind, setKind] = useState<ErrorKind | null>(null);

  useEffect(() => {
    const onReported = (e: Event) => setKind((e as CustomEvent<ErrorKind>).detail);
    // Errors thrown in event handlers or promises that nothing caught
    const onError = (e: ErrorEvent) => {
      console.error("[wird] unexpected:", e.error ?? e.message);
      setKind("unexpected");
    };
    const onRejection = (e: PromiseRejectionEvent) => reportError("unexpected", e.reason);
    window.addEventListener(ERROR_EVENT, onReported);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener(ERROR_EVENT, onReported);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  if (!kind) return null;
  return (
    <div
      role="alert"
      className="fixed inset-x-3 top-3 z-[70] mx-auto flex max-w-xl items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 shadow"
    >
      <p className="flex-1">{t[`error.${kind}`]}</p>
      <button
        type="button"
        onClick={() => setKind(null)}
        aria-label={t["error.dismiss"]}
        className="rounded-lg p-1 hover:bg-red-100"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export default function WirdApp({ t }: { t: Strings }) {
  return (
    <>
      <ErrorBanner t={t} />
      <Screens t={t} />
    </>
  );
}
