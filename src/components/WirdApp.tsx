import {
  ChevronLeft,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  Settings,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import GroupBoard from "@/components/GroupBoard";
import GroupTable from "@/components/GroupTable";
import GroupWeek from "@/components/GroupWeek";
import { audienceStrings, fill, inputClass, type Strings } from "@/components/ui";
import { ApiError, fetchSession, fetchSummaries, type Session, sendOp } from "@/lib/api";
import { getSignOutUrl } from "@/lib/auth";
import { ERROR_EVENT, type ErrorKind, reportError } from "@/lib/errors";
import { newId } from "@/lib/id";
import { applyOp, type Op, reloadsAfter } from "@/lib/ops";
import {
  type Audience,
  canRemoveSupervisor,
  type Data,
  type Group,
  groupMembers,
  type Initiative,
  type InitiativeSummary,
  initiativeGroups,
  type Person,
  personName,
} from "@/lib/store";
import { dayView, wirdDate } from "@/lib/wird";
import { cn } from "@/utils/cn";

const DEV_EMAIL_COOKIE = "wird_dev_email";

type Route =
  | { view: "home" }
  | { view: "admin" }
  | { view: "group" | "table" | "week"; groupId: string };

function parseHash(hash: string): Route {
  if (hash === "#/admin") return { view: "admin" };
  const m = hash.match(/^#\/g\/([^/]+)(?:\/(table|week))?$/);
  if (!m) return { view: "home" };
  const view = m[2] === "table" || m[2] === "week" ? m[2] : "group";
  return { view, groupId: decodeURIComponent(m[1]) };
}

function go(route: Route) {
  location.hash =
    route.view === "home"
      ? ""
      : route.view === "admin"
        ? "#/admin"
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
  else location.href = getSignOutUrl(`${location.origin}/`);
}

/** The manager field: nobody, someone already in the initiative, or someone new by email */
interface GroupForm {
  id?: string;
  name: string;
  manager: string; // "" for nobody, a person id, or NEW_MANAGER
  newName: string;
  newEmail: string;
  audience: Audience;
}

const NEW_MANAGER = "new";

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
  const [creating, setCreating] = useState(false);
  const { me } = data;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-2 text-sm text-stone-600">
        <span className="min-w-0 truncate">
          {me.name}
          {me.admin && ` · ${t["role.admin"]}`}
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {me.admin && (
            <a href="#/admin" className="inline-flex items-center gap-1 hover:text-slate-900">
              <Settings className="h-4 w-4" aria-hidden="true" />
              {t["admin.link"]}
            </a>
          )}
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-1 hover:text-slate-900"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {t["auth.sign_out"]}
          </button>
        </span>
      </div>

      {data.initiatives.length === 0 ? (
        <CreateInitiative t={t} data={data} apply={apply} first />
      ) : (
        data.initiatives.map((i) => (
          <InitiativeSection
            key={i.id}
            t={t}
            data={data}
            apply={apply}
            initiative={i}
            today={today}
          />
        ))
      )}

      {data.initiatives.length > 0 &&
        me.canCreate &&
        (creating ? (
          <CreateInitiative t={t} data={data} apply={apply} onCancel={() => setCreating(false)} />
        ) : (
          <button type="button" className="btn-secondary w-full" onClick={() => setCreating(true)}>
            <Plus className="h-5 w-5" aria-hidden="true" />
            {t["initiative.new"]}
          </button>
        ))}
    </div>
  );
}

/** Open sign-up: anyone signed in can start an initiative and becomes its supervisor */
function CreateInitiative({
  t,
  data,
  apply,
  first,
  onCancel,
}: {
  t: Strings;
  data: Data;
  apply: (op: Op) => void;
  first?: boolean;
  onCancel?: () => void;
}) {
  const [name, setName] = useState("");

  function create(e: { preventDefault(): void }) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    apply({ type: "initiativeCreate", id: newId(), name: trimmed });
    setName("");
    onCancel?.();
  }

  return (
    <form onSubmit={create} className="card space-y-4">
      <h1 className={cn("font-bold text-slate-900", first ? "text-2xl" : "text-lg")}>
        {t["initiative.create_title"]}
      </h1>
      {first && <p className="text-stone-600">{t["initiative.create_intro"]}</p>}
      <label className="block space-y-1">
        <span className="text-sm font-medium">{t["initiative.name"]}</span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t["initiative.name_placeholder"]}
          className={inputClass}
        />
      </label>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1">
          {t["initiative.create"]}
        </button>
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {t["common.cancel"]}
          </button>
        )}
      </div>
      {first && (
        <p className="text-xs text-stone-500">
          {t["initiative.invited_hint"]}{" "}
          <span dir="ltr" className="font-medium">
            {data.me.email}
          </span>
        </p>
      )}
    </form>
  );
}

function InitiativeSection({
  t,
  data,
  apply,
  initiative,
  today,
}: {
  t: Strings;
  data: Data;
  apply: (op: Op) => void;
  initiative: Initiative;
  today: string;
}) {
  const [groupForm, setGroupForm] = useState<GroupForm | null>(null);
  const supervisor = initiative.role === "supervisor";
  const groups = initiativeGroups(data, initiative.id);

  // People a supervisor can pick as a group's manager: this initiative's supervisors and managers
  const candidates: Person[] = data.people.filter(
    (p) => initiative.supervisorIds.includes(p.id) || groups.some((g) => g.managerId === p.id),
  );

  function edit(g: Group) {
    setGroupForm({
      id: g.id,
      name: g.name,
      manager: g.managerId ?? "",
      newName: "",
      newEmail: "",
      audience: g.audience,
    });
  }

  function saveGroup(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!groupForm) return;
    const name = groupForm.name.trim();
    if (!name) return;
    let manager: { name: string; email: string } | null = null;
    if (groupForm.manager === NEW_MANAGER) {
      manager = {
        name: groupForm.newName.trim(),
        email: groupForm.newEmail.trim().toLowerCase(),
      };
      if (!manager.name || !manager.email) return;
    } else if (groupForm.manager) {
      const p = candidates.find((c) => c.id === groupForm.manager);
      if (p) manager = { name: p.name, email: p.email };
    }
    apply({
      type: "groupSave",
      id: groupForm.id ?? newId(),
      initiativeId: initiative.id,
      name,
      manager,
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
    <section className="space-y-3" aria-labelledby={`initiative-${initiative.id}`}>
      <div className="flex items-baseline justify-between gap-2">
        <h1 id={`initiative-${initiative.id}`} className="text-2xl font-bold text-slate-900">
          {initiative.name}
        </h1>
        <span className="shrink-0 text-sm text-stone-500">{t[`role.${initiative.role}`]}</span>
      </div>

      {initiative.suspended ? (
        <p className="card text-stone-600">{t["initiative.suspended"]}</p>
      ) : (
        <>
          {groups.length === 0 && (
            <p className="card text-stone-600">
              {supervisor ? t["groups.empty_supervisor"] : t["groups.empty_manager"]}
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
                        {personName(data, g.managerId) ?? t["groups.no_manager"]}
                        {" · "}
                        {fill(t["wird.progress"], { done, total: members.length })}
                      </p>
                    </div>
                    <ChevronLeft
                      className="h-5 w-5 shrink-0 text-stone-400 ltr:rotate-180"
                      aria-hidden="true"
                    />
                  </a>
                  {supervisor && (
                    <button
                      type="button"
                      onClick={() => edit(g)}
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

          {supervisor && !groupForm && (
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={() =>
                setGroupForm({
                  name: "",
                  manager: "",
                  newName: "",
                  newEmail: "",
                  audience: "girls",
                })
              }
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
              {t["groups.add"]}
            </button>
          )}

          {supervisor && groupForm && (
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
              <div className="space-y-2">
                <label className="block space-y-1">
                  <span className="text-sm font-medium">{t["groups.manager"]}</span>
                  <select
                    value={groupForm.manager}
                    onChange={(e) => setGroupForm({ ...groupForm, manager: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">{t["groups.no_manager"]}</option>
                    {candidates.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.id === data.me.staffId ? `${p.name} (${t["staff.you"]})` : p.name}
                      </option>
                    ))}
                    <option value={NEW_MANAGER}>{t["groups.manager_new"]}</option>
                  </select>
                </label>
                {groupForm.manager === NEW_MANAGER && (
                  <>
                    <input
                      required
                      value={groupForm.newName}
                      onChange={(e) => setGroupForm({ ...groupForm, newName: e.target.value })}
                      placeholder={t["staff.name_placeholder"]}
                      aria-label={t["staff.name_placeholder"]}
                      className={inputClass}
                    />
                    <input
                      required
                      type="email"
                      dir="ltr"
                      value={groupForm.newEmail}
                      onChange={(e) => setGroupForm({ ...groupForm, newEmail: e.target.value })}
                      placeholder={t["staff.email_placeholder"]}
                      aria-label={t["staff.email_placeholder"]}
                      className={cn(inputClass, "text-end")}
                    />
                  </>
                )}
                <p className="text-xs text-stone-500">{t["groups.manager_hint"]}</p>
              </div>
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
                        name={`audience-${initiative.id}`}
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
                      const g = groups.find((x) => x.id === groupForm.id);
                      if (g) removeGroup(g);
                    }}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </form>
          )}

          {supervisor && (
            <SupervisorsSection t={t} data={data} apply={apply} initiative={initiative} />
          )}
        </>
      )}
    </section>
  );
}

/** An initiative's supervisors, with a form to add one by email */
function SupervisorsSection({
  t,
  data,
  apply,
  initiative,
}: {
  t: Strings;
  data: Data;
  apply: (op: Op) => void;
  initiative: Initiative;
}) {
  const [form, setForm] = useState({ name: "", email: "" });
  const people = initiative.supervisorIds
    .map((id) => data.people.find((p) => p.id === id))
    .filter((p): p is Person => Boolean(p));

  function add(e: { preventDefault(): void }) {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    if (!name || !email) return;
    if (people.some((p) => p.email === email)) {
      reportError("email_taken", new Error(email));
      return;
    }
    apply({ type: "supervisorAdd", initiativeId: initiative.id, name, email });
    setForm({ name: "", email: "" });
  }

  function remove(p: Person) {
    const message =
      p.id === data.me.staffId
        ? t["supervisors.delete_self_confirm"]
        : fill(t["supervisors.delete_confirm"], { name: p.name });
    if (!confirm(message)) return;
    apply({ type: "supervisorRemove", initiativeId: initiative.id, personId: p.id });
  }

  return (
    <div className="space-y-3 pt-2">
      <h2 className="text-lg font-semibold text-slate-900">{t["supervisors.title"]}</h2>
      <p className="text-sm text-stone-600">{t["supervisors.hint"]}</p>
      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white">
        {people.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 px-4 py-2">
            <span className="min-w-0">
              <span className="block truncate">{p.name}</span>
              <span className="block truncate text-xs text-stone-500" dir="ltr">
                {p.email}
              </span>
              {p.id === data.me.staffId && (
                <span className="block text-xs text-stone-500">{t["staff.you"]}</span>
              )}
              {!p.linked && (
                <span className="block text-xs text-amber-700">{t["staff.not_signed_in"]}</span>
              )}
            </span>
            {canRemoveSupervisor(initiative) && (
              <button
                type="button"
                onClick={() => remove(p)}
                aria-label={fill(t["staff.delete"], { name: p.name })}
                className="rounded-lg p-2 text-stone-500 hover:bg-slate-50 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
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
          {t["supervisors.add"]}
        </button>
      </form>
    </div>
  );
}

/** App admins: every initiative's name, supervisors and counts, with suspend and delete */
function AdminPage({
  t,
  onBack,
  onChanged,
}: {
  t: Strings;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [list, setList] = useState<InitiativeSummary[] | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; typed: string } | null>(null);

  const load = useCallback(() => {
    fetchSummaries()
      .then(setList)
      .catch((error) => reportError("load", error));
  }, []);

  useEffect(load, [load]);

  async function send(op: Op) {
    try {
      await sendOp(op);
    } catch (error) {
      reportError(error instanceof ApiError && error.status === 403 ? "forbidden" : "save", error);
    }
    setDeleting(null);
    load();
    // She may supervise the initiative too, so her own view can change
    onChanged();
  }

  function toggle(i: InitiativeSummary) {
    const key = i.suspended ? "admin.resume_confirm" : "admin.suspend_confirm";
    if (!confirm(fill(t[key], { name: i.name }))) return;
    send({ type: "initiativeSuspend", id: i.id, suspended: !i.suspended });
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4 rotate-180 ltr:rotate-0" aria-hidden="true" />
        {t["common.back"]}
      </button>
      <h1 className="text-2xl font-bold text-slate-900">{t["admin.title"]}</h1>
      <p className="text-sm text-stone-600">{t["admin.intro"]}</p>
      {!list && <p className="text-stone-500">{t["common.loading"]}</p>}
      {list?.length === 0 && <p className="card text-stone-600">{t["admin.empty"]}</p>}
      <ul className="space-y-3">
        {list?.map((i) => (
          <li key={i.id} className="card space-y-3 !p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="min-w-0 truncate text-lg font-semibold text-slate-900">{i.name}</h2>
              {i.suspended && (
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                  {t["admin.suspended"]}
                </span>
              )}
            </div>
            <p className="text-sm text-stone-600">
              {fill(t["admin.groups"], { n: i.groups })}
              {" · "}
              {fill(t["admin.members"], { n: i.members })}
            </p>
            <div className="text-sm">
              <p className="font-medium text-slate-700">{t["supervisors.title"]}</p>
              <ul className="mt-1 space-y-1">
                {i.supervisors.map((s) => (
                  <li key={s.email} className="text-stone-600">
                    {s.name}{" "}
                    <span dir="ltr" className="text-xs text-stone-500">
                      {s.email}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {deleting?.id === i.id ? (
              <form
                className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (deleting.typed.trim() !== i.name) return;
                  send({ type: "initiativeDelete", id: i.id, name: i.name });
                }}
              >
                <p className="text-sm font-medium text-red-800">
                  {fill(t["admin.delete_title"], { name: i.name })}
                </p>
                <label className="block space-y-1 text-sm text-red-800">
                  <span>{t["admin.delete_warning"]}</span>
                  <input
                    value={deleting.typed}
                    onChange={(e) => setDeleting({ id: i.id, typed: e.target.value })}
                    className={inputClass}
                    autoComplete="off"
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={deleting.typed.trim() !== i.name}
                    className="btn-primary flex-1 !bg-red-700 disabled:opacity-50"
                  >
                    {t["admin.delete_confirm"]}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setDeleting(null)}>
                    {t["common.cancel"]}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex gap-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => toggle(i)}>
                  {i.suspended ? t["admin.resume"] : t["admin.suspend"]}
                </button>
                <button
                  type="button"
                  className="btn-secondary text-red-700"
                  onClick={() => setDeleting({ id: i.id, typed: "" })}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {t["admin.delete"]}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
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

  /**
   * Daily changes show at once, then save; changes to initiatives, groups and supervisors save first,
   * then reload what she can see now. On failure report it and reload the saved state.
   */
  const apply = useCallback(
    (op: Op) => {
      setSession((s) => (s?.kind === "ready" ? { ...s, data: applyOp(s.data, op) } : s));
      sendOp(op)
        .then(() => reloadsAfter(op) && reload())
        .catch((error) => {
          const status = error instanceof ApiError ? error.status : 0;
          if (status === 409) reportError("email_taken", error);
          else if (status === 403) reportError("forbidden", error);
          else if (status === 429) reportError("limit", error);
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

  const { data } = session;
  if (route.view === "admin" && data.me.admin) {
    return <AdminPage t={t} onBack={() => go({ view: "home" })} onChanged={reload} />;
  }
  if (route.view === "group" || route.view === "table" || route.view === "week") {
    const group = data.groups.find((g) => g.id === route.groupId);
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
