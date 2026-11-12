import { ChevronLeft, LogIn, LogOut, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import GroupBoard from "@/components/GroupBoard";
import GroupTable from "@/components/GroupTable";
import GroupWeek from "@/components/GroupWeek";
import { audienceStrings, fill, inputClass, type Strings } from "@/components/ui";
import { ApiError, fetchSession, type Session, sendOp } from "@/lib/api";
import { getSignOutUrl } from "@/lib/auth";
import { ERROR_EVENT, type ErrorKind, reportError } from "@/lib/errors";
import { newId } from "@/lib/id";
import { applyOp, type Op } from "@/lib/ops";
import {
  type Audience,
  canRemoveStaff,
  type Data,
  type Group,
  groupMembers,
  type Role,
  type Staff,
  visibleGroups,
} from "@/lib/store";
import { dayView, wirdDate } from "@/lib/wird";
import { cn } from "@/utils/cn";

const DEV_EMAIL_COOKIE = "wird_dev_email";

type Route = { view: "home" } | { view: "group" | "table" | "week"; groupId: string };

function parseHash(hash: string): Route {
  const m = hash.match(/^#\/g\/([^/]+)(?:\/(table|week))?$/);
  if (!m) return { view: "home" };
  const view = m[2] === "table" || m[2] === "week" ? m[2] : "group";
  return { view, groupId: decodeURIComponent(m[1]) };
}

function go(route: Route) {
  location.hash =
    route.view === "home"
      ? ""
      : `#/g/${route.groupId}${route.view === "group" ? "" : `/${route.view}`}`;
}

function setDevEmail(email: string) {
  // biome-ignore lint/suspicious/noDocumentCookie: dev-only switch; the Cookie Store API is missing in Firefox and on plain http
  document.cookie = email
    ? `${DEV_EMAIL_COOKIE}=${encodeURIComponent(email)}; path=/; SameSite=Lax`
    : `${DEV_EMAIL_COOKIE}=; path=/; max-age=0`;
  location.reload();
}

function signOut() {
  if (import.meta.env.DEV) setDevEmail("");
  else location.href = getSignOutUrl();
}

interface GroupForm {
  id?: string;
  name: string;
  managerId: string;
  audience: Audience;
}

const AUDIENCES: Audience[] = ["girls", "boys"];

/** Local development only: pretend to be any supervisor or manager email */
function DevSwitch({ t, emails }: { t: Strings; emails: string[] }) {
  const current = document.cookie.match(/(?:^|; )wird_dev_email=([^;]*)/)?.[1];
  const [email, setEmail] = useState(current ? decodeURIComponent(current) : "");
  return (
    <form
      className="mb-6 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        setDevEmail(email.trim().toLowerCase());
      }}
    >
      <label className="flex items-center gap-2">
        <span className="shrink-0 font-medium text-amber-900">{t["dev.acting_as"]}</span>
        <input
          list="dev-emails"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          dir="ltr"
          className={cn(inputClass, "py-1.5")}
        />
        <datalist id="dev-emails">
          {emails.map((e) => (
            <option key={e} value={e} />
          ))}
        </datalist>
        <button type="submit" className="btn-secondary shrink-0 !px-3 !py-1.5 text-sm">
          {t["dev.switch"]}
        </button>
      </label>
      <p className="mt-1 text-xs text-amber-800">{t["dev.note"]}</p>
    </form>
  );
}

function Home({
  t,
  data,
  apply,
  today,
}: {
  t: Strings;
  data: Data;
  apply: (op: Op) => void;
  today: string;
}) {
  const [groupForm, setGroupForm] = useState<GroupForm | null>(null);

  const user = data.me;
  const groups = visibleGroups(data);
  const managers = data.staff.filter((s) => s.role === "manager");
  const isSupervisor = user.role === "supervisor";
  const nameOf = (id: string | null) => data.staff.find((s) => s.id === id)?.name;

  function saveGroup(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!groupForm) return;
    const name = groupForm.name.trim();
    if (!name) return;
    apply({
      type: "groupSave",
      id: groupForm.id ?? newId(),
      name,
      managerId: groupForm.managerId || null,
      audience: groupForm.audience,
    });
    setGroupForm(null);
  }

  function removeGroup(g: Group) {
    if (!confirm(fill(t["groups.delete_confirm"], { name: g.name }))) return;
    apply({ type: "groupRemove", id: g.id });
    setGroupForm(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 text-sm text-stone-600">
        <span className="min-w-0 truncate">
          {user.name} · {t[`role.${user.role}`]}
        </span>
        <button
          type="button"
          onClick={signOut}
          className="inline-flex shrink-0 items-center gap-1 hover:text-slate-900"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {t["auth.sign_out"]}
        </button>
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
                      {t[`audience.${g.audience}`]}
                      {" · "}
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
                      setGroupForm({
                        id: g.id,
                        name: g.name,
                        managerId: g.managerId ?? "",
                        audience: g.audience,
                      })
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
            onClick={() =>
              setGroupForm({ name: "", managerId: managers[0]?.id ?? "", audience: "girls" })
            }
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
            <fieldset className="space-y-1">
              <legend className="text-sm font-medium">{t["groups.audience"]}</legend>
              <div className="flex gap-2">
                {AUDIENCES.map((a) => (
                  <label
                    key={a}
                    className={cn(
                      "flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm",
                      groupForm.audience === a
                        ? "border-hasanat bg-hasanat/5 font-medium text-hasanat-dark"
                        : "border-stone-200 text-slate-700",
                    )}
                  >
                    <input
                      type="radio"
                      name="audience"
                      value={a}
                      checked={groupForm.audience === a}
                      onChange={() => setGroupForm({ ...groupForm, audience: a })}
                      className="sr-only"
                    />
                    {t[`audience.${a}`]}
                  </label>
                ))}
              </div>
            </fieldset>
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

      {isSupervisor && <StaffSection t={t} data={data} apply={apply} kind="manager" />}
      {isSupervisor && <StaffSection t={t} data={data} apply={apply} kind="supervisor" />}
    </div>
  );
}

/** The supervisor's list of managers or of supervisors, with a form to add one by email */
function StaffSection({
  t,
  data,
  apply,
  kind,
}: {
  t: Strings;
  data: Data;
  apply: (op: Op) => void;
  kind: Role;
}) {
  const [form, setForm] = useState({ name: "", email: "" });
  const people = data.staff.filter((s) => s.role === kind);
  const managers = kind === "manager";

  function add(e: { preventDefault(): void }) {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    if (!name || !email) return;
    if (data.staff.some((s) => s.email === email)) {
      reportError("email_taken", new Error(email));
      return;
    }
    apply({ type: "staffAdd", id: newId(), name, email, role: kind });
    setForm({ name: "", email: "" });
  }

  function remove(s: Staff) {
    const message =
      s.id === data.me.id
        ? t["supervisors.delete_self_confirm"]
        : fill(t[managers ? "staff.delete_confirm" : "supervisors.delete_confirm"], {
            name: s.name,
          });
    if (!confirm(message)) return;
    apply({ type: "staffRemove", id: s.id });
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">
        {t[managers ? "staff.title" : "supervisors.title"]}
      </h2>
      {!managers && <p className="text-sm text-stone-600">{t["supervisors.hint"]}</p>}
      {people.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white">
          {people.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 px-4 py-2">
              <span className="min-w-0">
                <span className="block truncate" dir={s.name === s.email ? "ltr" : undefined}>
                  {s.name}
                  {managers && (
                    <span className="ms-2 text-xs text-stone-500">
                      {fill(t["staff.groups_count"], {
                        n: data.groups.filter((g) => g.managerId === s.id).length,
                      })}
                    </span>
                  )}
                </span>
                {s.name !== s.email && (
                  <span className="block truncate text-xs text-stone-500" dir="ltr">
                    {s.email}
                  </span>
                )}
                {(s.main || s.id === data.me.id) && (
                  <span className="block text-xs text-stone-500">
                    {[s.main && t["supervisors.main"], s.id === data.me.id && t["staff.you"]]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
                {!s.linked && (
                  <span className="block text-xs text-amber-700">{t["staff.not_signed_in"]}</span>
                )}
              </span>
              {canRemoveStaff(data, s) && (
                <button
                  type="button"
                  onClick={() => remove(s)}
                  aria-label={fill(t["staff.delete"], { name: s.name })}
                  className="rounded-lg p-2 text-stone-500 hover:bg-slate-50 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="card space-y-3 !p-4">
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder={t["staff.name_placeholder"]}
          aria-label={t["staff.name_placeholder"]}
          className={inputClass}
        />
        <input
          required
          type="email"
          dir="ltr"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder={t["staff.email_placeholder"]}
          aria-label={t["staff.email_placeholder"]}
          className={cn(inputClass, "text-end")}
        />
        <p className="text-xs text-stone-500">{t["staff.email_hint"]}</p>
        <button type="submit" className="btn-secondary w-full">
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          {t[managers ? "staff.add" : "supervisors.add"]}
        </button>
      </form>
    </section>
  );
}

function Screens({ t }: { t: Strings }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [route, setRoute] = useState<Route>({ view: "home" });
  const [today, setToday] = useState(() => wirdDate());

  const reload = useCallback(() => {
    fetchSession()
      .then((s) => {
        setSession(s);
        setLoadFailed(false);
      })
      .catch((error) => {
        reportError("load", error);
        setLoadFailed(true);
      });
  }, []);

  useEffect(() => {
    reload();
    setRoute(parseHash(location.hash));
    const onHash = () => setRoute(parseHash(location.hash));
    // Pick up changes made on other phones when she comes back to the app
    const onVisible = () => document.visibilityState === "visible" && reload();
    window.addEventListener("hashchange", onHash);
    document.addEventListener("visibilitychange", onVisible);
    // Keep "today" right if the page stays open across the day boundary
    const id = window.setInterval(() => setToday(wirdDate()), 60_000);
    return () => {
      window.removeEventListener("hashchange", onHash);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(id);
    };
  }, [reload]);

  /** Show the change at once, then save it; on failure report it and reload the saved state */
  const apply = useCallback(
    (op: Op) => {
      setSession((s) => (s?.kind === "ready" ? { ...s, data: applyOp(s.data, op) } : s));
      sendOp(op)
        // Removing someone may remove her own access, so fetch what she can see now
        .then(() => op.type === "staffRemove" && reload())
        .catch((error) => {
          if (error instanceof ApiError && error.status === 409) reportError("email_taken", error);
          else if (error instanceof ApiError && error.status === 403)
            reportError("forbidden", error);
          else reportError("save", error);
          reload();
        });
    },
    [reload],
  );

  const dev = import.meta.env.DEV && session?.dev ? <DevSwitch t={t} emails={session.dev} /> : null;

  if (!session) {
    return loadFailed ? (
      <div className="card space-y-3 text-center">
        <p className="text-stone-600">{t["error.load"]}</p>
        <button type="button" className="btn-secondary" onClick={reload}>
          {t["common.retry"]}
        </button>
      </div>
    ) : (
      <p className="text-stone-500">{t["common.loading"]}</p>
    );
  }

  if (session.kind === "signed_out") {
    return (
      <>
        {dev}
        <div className="card space-y-4 text-center">
          <h1 className="text-2xl font-bold text-slate-900">{t["auth.title"]}</h1>
          <p className="text-stone-600">{t["auth.intro"]}</p>
          {!import.meta.env.DEV && (
            <a href={session.signInUrl} className="btn-primary">
              <LogIn className="h-5 w-5" aria-hidden="true" />
              {t["auth.sign_in"]}
            </a>
          )}
        </div>
      </>
    );
  }

  if (session.kind === "not_added") {
    return (
      <>
        {dev}
        <div className="card space-y-4 text-center">
          <h1 className="text-xl font-bold text-slate-900">{t["auth.not_added_title"]}</h1>
          <p className="text-stone-600">{t["auth.not_added"]}</p>
          <p className="font-medium" dir="ltr">
            {session.email}
          </p>
          <button type="button" className="btn-secondary" onClick={signOut}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {t["auth.sign_out"]}
          </button>
        </div>
      </>
    );
  }

  const { data } = session;
  if (route.view !== "home") {
    const group = visibleGroups(data).find((g) => g.id === route.groupId);
    if (group && route.view === "table") {
      return (
        <GroupTable
          key={group.id}
          t={audienceStrings(t, group.audience)}
          data={data}
          group={group}
          today={today}
          onClose={() => go({ view: "group", groupId: group.id })}
        />
      );
    }
    if (group && route.view === "week") {
      return (
        <GroupWeek
          key={group.id}
          t={audienceStrings(t, group.audience)}
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
          t={audienceStrings(t, group.audience)}
          data={data}
          apply={apply}
          group={group}
          user={data.me}
          today={today}
          onBack={() => go({ view: "home" })}
          onTable={() => go({ view: "table", groupId: group.id })}
          onWeek={() => go({ view: "week", groupId: group.id })}
        />
      );
    }
  }

  return (
    <>
      {dev}
      <Home t={t} data={data} apply={apply} today={today} />
    </>
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
