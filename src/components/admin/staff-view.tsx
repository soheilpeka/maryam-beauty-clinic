"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  staffSchema,
  scheduleSchema,
  dayOffSchema,
  flattenZodErrors,
} from "@/lib/validation";
import { translateValidationKey } from "@/lib/booking-ui";
import {
  getCsrfToken,
  minutesToInputValue,
  timeValueToMinutes,
} from "@/lib/admin-client";
import {
  type StaffView,
  type ServiceView,
  type DayOffView,
} from "@/lib/admin-views";

/**
 * Specialists manager: profiles, the services each one performs, their weekly working hours
 * and their days off. The list comes from /api/admin/staff and /api/admin/services; every
 * change goes back through those routes with a session + CSRF token, and the forms are
 * validated on the client with the same schemas the server enforces.
 */

interface WindowDraft {
  id: string;
  dayOfWeek: number;
  startInput: string;
  endInput: string;
  breakStartInput: string;
  breakEndInput: string;
}

interface StaffList {
  ok: true;
  staff: StaffView[];
}
interface ServiceList {
  ok: true;
  services: ServiceView[];
}

type StaffFormState = {
  mode: "create" | "edit";
  id: string | null;
  name: string;
  role: string;
  bio: string;
  avatarUrl: string;
  active: boolean;
  serviceIds: string[];
  errors: Record<string, string>;
  submitting: boolean;
};

type ScheduleState = {
  staffId: string;
  staffName: string;
  windows: WindowDraft[];
  error: string | null;
  submitting: boolean;
};

type DayOffFormState = {
  staffId: string;
  staffName: string;
  dayKey: string;
  startInput: string;
  endInput: string;
  note: string;
  errors: Record<string, string>;
  submitting: boolean;
};

type DeleteState = {
  staffId: string;
  staffName: string;
  bookingCount: number;
  error: string | null;
  submitting: boolean;
};

type DialogState = StaffFormState | ScheduleState | DayOffFormState | DeleteState | null;

let draftSeq = 0;
function nextDraftId(): string {
  draftSeq += 1;
  return `draft-${draftSeq}`;
}

function emptyStaffForm(): StaffFormState {
  return {
    mode: "create",
    id: null,
    name: "",
    role: "",
    bio: "",
    avatarUrl: "",
    active: true,
    serviceIds: [],
    errors: {},
    submitting: false,
  };
}

function staffFormFromExisting(staff: StaffView): StaffFormState {
  return {
    ...emptyStaffForm(),
    mode: "edit",
    id: staff.id,
    name: staff.name,
    role: staff.role,
    bio: staff.bio ?? "",
    avatarUrl: staff.avatarUrl ?? "",
    active: staff.active,
    serviceIds: [...staff.serviceIds],
  };
}

function scheduleDraftsFromStaff(staff: StaffView): WindowDraft[] {
  return staff.schedule.map((w) => ({
    id: w.id,
    dayOfWeek: w.dayOfWeek,
    startInput: minutesToInputValue(w.startTime),
    endInput: minutesToInputValue(w.endTime),
    breakStartInput: w.breaks[0] ? minutesToInputValue(w.breaks[0].startTime) : "",
    breakEndInput: w.breaks[0] ? minutesToInputValue(w.breaks[0].endTime) : "",
  }));
}

const DAY_KEYS = ["daySun", "dayMon", "dayTue", "dayWed", "dayThu", "dayFri", "daySat"] as const;

export function StaffView({ locale }: { locale: string }) {
  const t = useTranslations("Admin");
  const tValidation = useTranslations("Validation");
  const [staff, setStaff] = useState<StaffView[] | null>(null);
  const [services, setServices] = useState<ServiceView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [staffRes, servicesRes] = await Promise.all([
        fetch("/api/admin/staff", { cache: "no-store" }),
        fetch("/api/admin/services", { cache: "no-store" }),
      ]);
      if (!staffRes.ok || !servicesRes.ok) throw new Error("staff list failed");
      const staffJson = (await staffRes.json()) as StaffList;
      const servicesJson = (await servicesRes.json()) as ServiceList;
      setStaff(staffJson.staff);
      setServices(servicesJson.services);
    } catch {
      setError(t("errorHint"));
      setStaff(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  function closeDialog() {
    setDialog((current) => (current && current.submitting ? current : null));
  }
  async function submitStaffForm(state: StaffFormState) {
    const payload = {
      name: state.name.trim(),
      role: state.role.trim() || undefined,
      bio: state.bio.trim() || undefined,
      avatarUrl: state.avatarUrl.trim() || undefined,
      active: state.active,
      serviceIds: state.serviceIds,
    };
    const clientParsed = staffSchema.safeParse(payload);
    if (!clientParsed.success) {
      const translated: Record<string, string> = {};
      for (const [k, v] of Object.entries(flattenZodErrors(clientParsed))) {
        translated[k] = translateValidationKey(v, tValidation);
      }
      setDialog({ ...state, errors: translated });
      return;
    }

    setDialog({ ...state, submitting: true, errors: {} });
    const token = await getCsrfToken();
    if (!token) {
      setDialog({ ...state, submitting: false, errors: { form: tValidation("form") } });
      return;
    }
    try {
      const url = state.id ? `/api/admin/staff/${state.id}` : "/api/admin/staff";
      const method = state.id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json", "x-admin-csrf": token },
        body: JSON.stringify(clientParsed.data),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok) {
        setDialog({ ...state, submitting: false, errors: { form: json.message ?? t("errorHint") } });
        return;
      }
      setDialog(null);
      void load();
    } catch {
      setDialog({ ...state, submitting: false, errors: { form: t("errorHint") } });
    }
  }

  async function submitSchedule(state: ScheduleState) {
    const windows = state.windows
      .map((w) => ({
        dayOfWeek: w.dayOfWeek,
        startTime: timeValueToMinutes(w.startInput),
        endTime: timeValueToMinutes(w.endInput),
        breakStart: w.breakStartInput ? timeValueToMinutes(w.breakStartInput) : undefined,
        breakEnd: w.breakEndInput ? timeValueToMinutes(w.breakEndInput) : undefined,
      }))
      // A row with both times cleared is a deletion; any other half-filled row is a real
      // error and is reported by the schema below instead of being silently dropped.
      .filter((w) => w.startTime !== null && w.endTime !== null);

    const clientParsed = scheduleSchema.safeParse({
      windows: windows.map((w) => ({
        dayOfWeek: w.dayOfWeek,
        startTime: w.startTime,
        endTime: w.endTime,
        breaks:
          w.breakStart !== undefined && w.breakEnd !== undefined
            ? [{ startTime: w.breakStart, endTime: w.breakEnd }]
            : [],
      })),
    });
    if (!clientParsed.success) {
      const first = Object.values(flattenZodErrors(clientParsed))[0] ?? tValidation("form");
      setDialog({ ...state, error: translateValidationKey(first, tValidation) });
      return;
    }

    setDialog({ ...state, submitting: true, error: null });
    const token = await getCsrfToken();
    if (!token) {
      setDialog({ ...state, submitting: false, error: tValidation("form") });
      return;
    }
    try {
      const res = await fetch(`/api/admin/staff/${state.staffId}/schedule`, {
        method: "PUT",
        headers: { "content-type": "application/json", "x-admin-csrf": token },
        body: JSON.stringify(clientParsed.data),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok) {
        setDialog({ ...state, submitting: false, error: json.message ?? t("errorHint") });
        return;
      }
      setDialog(null);
      void load();
    } catch {
      setDialog({ ...state, submitting: false, error: t("errorHint") });
    }
  }

  async function submitDayOff(state: DayOffFormState) {
    const payload = {
      staffId: state.staffId,
      dayKey: state.dayKey,
      startMin: state.startInput ? timeValueToMinutes(state.startInput) : undefined,
      endMin: state.endInput ? timeValueToMinutes(state.endInput) : undefined,
      note: state.note.trim() || undefined,
    };
    const clientParsed = dayOffSchema.safeParse(payload);
    if (!clientParsed.success) {
      const translated: Record<string, string> = {};
      for (const [k, v] of Object.entries(flattenZodErrors(clientParsed))) {
        translated[k] = translateValidationKey(v, tValidation);
      }
      setDialog({ ...state, errors: translated });
      return;
    }

    setDialog({ ...state, submitting: true, errors: {} });
    const token = await getCsrfToken();
    if (!token) {
      setDialog({ ...state, submitting: false, errors: { form: tValidation("form") } });
      return;
    }
    try {
      const res = await fetch("/api/admin/days-off", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-csrf": token },
        body: JSON.stringify(clientParsed.data),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok) {
        setDialog({ ...state, submitting: false, errors: { form: json.message ?? t("errorHint") } });
        return;
      }
      setDialog(null);
      void load();
    } catch {
      setDialog({ ...state, submitting: false, errors: { form: t("errorHint") } });
    }
  }

  async function deleteDayOff(dayOffId: string) {
    const token = await getCsrfToken();
    if (!token) return;
    try {
      await fetch(`/api/admin/days-off/${dayOffId}`, {
        method: "DELETE",
        headers: { "x-admin-csrf": token },
      });
      void load();
    } catch {
      // The list refresh shows the row is still there; nothing else to do.
    }
  }

  async function submitDelete(state: DeleteState) {
    setDialog({ ...state, submitting: true, error: null });
    const token = await getCsrfToken();
    if (!token) {
      setDialog({ ...state, submitting: false, error: tValidation("form") });
      return;
    }
    try {
      const res = await fetch(`/api/admin/staff/${state.staffId}`, {
        method: "DELETE",
        headers: { "x-admin-csrf": token },
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok) {
        setDialog({ ...state, submitting: false, error: json.message ?? t("errorHint") });
        return;
      }
      setDialog(null);
      void load();
    } catch {
      setDialog({ ...state, submitting: false, error: t("errorHint") });
    }
  }
  if (loading) {
    return (
      <div aria-busy="true" aria-label={t("loadingStaff")} className="space-y-3">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-[#1a1512]"
          >
            <div className="h-4 w-1/4 rounded bg-stone-200 dark:bg-stone-800" />
            <div className="mt-3 h-3 w-2/3 rounded bg-stone-200 dark:bg-stone-800" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 px-3 py-3 text-sm dark:border-red-800 dark:bg-red-950/40">
        <p className="font-medium text-red-700 dark:text-red-300">{t("errorTitle")}</p>
        <p className="mt-0.5 text-red-600 dark:text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-2 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/60"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setDialog(emptyStaffForm())}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {t("addStaff")}
        </button>
      </div>

      {staff && staff.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center dark:border-stone-700 dark:bg-[#1a1512]">
          <p className="text-sm text-stone-600 dark:text-stone-400">{t("emptyStaff")}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {staff?.map((member) => (
            <StaffCard
              key={member.id}
              member={member}
              services={services}
              locale={locale}
              onEdit={() => setDialog(staffFormFromExisting(member))}
              onSchedule={() =>
                setDialog({
                  staffId: member.id,
                  staffName: member.name,
                  windows: scheduleDraftsFromStaff(member),
                  error: null,
                  submitting: false,
                })
              }
              onAddDayOff={() =>
                setDialog({
                  staffId: member.id,
                  staffName: member.name,
                  dayKey: "",
                  startInput: "",
                  endInput: "",
                  note: "",
                  errors: {},
                  submitting: false,
                })
              }
              onDeleteDayOff={deleteDayOff}
              onDelete={() =>
                setDialog({
                  staffId: member.id,
                  staffName: member.name,
                  bookingCount: member.bookingCount,
                  error: null,
                  submitting: false,
                })
              }
            />
          ))}
        </ul>
      )}

      {dialog && "serviceIds" in dialog && (
        <StaffFormDialog
          state={dialog}
          services={services}
          onChange={(patch) => setDialog((d) => (d && "serviceIds" in d ? { ...d, ...patch } : d))}
          onClose={closeDialog}
          onSubmit={submitStaffForm}
        />
      )}
      {dialog && "windows" in dialog && (
        <ScheduleDialog
          state={dialog}
          onChange={(patch) => setDialog((d) => (d && "windows" in d ? { ...d, ...patch } : d))}
          onClose={closeDialog}
          onSubmit={submitSchedule}
        />
      )}
      {dialog && "dayKey" in dialog && "staffName" in dialog && (
        <DayOffDialog
          state={dialog}
          onChange={(patch) => setDialog((d) => (d && "dayKey" in d ? { ...d, ...patch } : d))}
          onClose={closeDialog}
          onSubmit={submitDayOff}
        />
      )}
      {dialog && "bookingCount" in dialog && (
        <DeleteStaffDialog state={dialog} onClose={closeDialog} onSubmit={submitDelete} />
      )}
    </div>
  );
}
function StaffCard({
  member,
  services,
  locale,
  onEdit,
  onSchedule,
  onAddDayOff,
  onDeleteDayOff,
  onDelete,
}: {
  member: StaffView;
  services: ServiceView[];
  locale: string;
  onEdit: () => void;
  onSchedule: () => void;
  onAddDayOff: () => void;
  onDeleteDayOff: (id: string) => void;
  onDelete: () => void;
}) {
  const t = useTranslations("Admin");
  const serviceName = (id: string) => services.find((s) => s.id === id)?.name ?? "";

  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-[#1a1512]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-50">
              {member.name}
            </h3>
            <span
              className={
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold " +
                (member.active
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-stone-300 bg-stone-100 text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400")
              }
            >
              {member.active ? t("active") : t("inactive")}
            </span>
            <span className="text-sm text-stone-500 dark:text-stone-400">{member.role}</span>
          </div>
          {member.bio && (
            <p className="mt-1 max-w-2xl text-sm text-stone-600 dark:text-stone-400">{member.bio}</p>
          )}
          {member.serviceIds.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {member.serviceIds.map((id) => (
                <span
                  key={id}
                  className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-xs text-stone-700 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-300"
                >
                  {serviceName(id)}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">{t("noServicesAssigned")}</p>
          )}

          {member.schedule.length > 0 ? (
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 border-t border-stone-100 pt-3 text-sm sm:grid-cols-2 dark:border-stone-800">
              {member.schedule.map((w) => (
                <div key={w.id}>
                  <dt className="inline font-medium text-stone-600 dark:text-stone-400">
                    {t(DAY_KEYS[w.dayOfWeek])}:{" "}
                  </dt>
                  <dd className="inline text-stone-900 dark:text-stone-100">
                    {minutesToInputValue(w.startTime)}&ndash;{minutesToInputValue(w.endTime)}
                    {w.breaks.length > 0 &&
                      ` (${t("breakLabel")} ${minutesToInputValue(w.breaks[0].startTime)}-${minutesToInputValue(
                        w.breaks[0].endTime,
                      )})`}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-3 border-t border-stone-100 pt-3 text-xs text-amber-700 dark:border-stone-800 dark:text-amber-400">
              {t("noSchedule")}
            </p>
          )}

          {member.daysOff.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                {t("daysOff")}:
              </span>
              {member.daysOff.map((d) => (
                <span
                  key={d.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-xs text-stone-700 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-300"
                >
                  {dayOffLabel(d, locale, t)}
                  <button
                    type="button"
                    aria-label={t("removeDayOff")}
                    onClick={() => onDeleteDayOff(d.id)}
                    className="text-stone-400 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:text-red-400"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
            {member.bookingCount} {t("bookingsWord")}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" onClick={onEdit} className={actionClass}>
            {t("edit")}
          </button>
          <button type="button" onClick={onSchedule} className={actionClass}>
            {t("workingHours")}
          </button>
          <button type="button" onClick={onAddDayOff} className={actionClass}>
            {t("addDayOff")}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-red-300 px-3.5 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
          >
            {t("delete")}
          </button>
        </div>
      </div>
    </li>
  );
}

function dayOffLabel(d: DayOffView, locale: string, t: (k: string) => string): string {
  const [y, m, day] = d.dayKey.split("-").map(Number);
  const date = new Date(y, m - 1, day).toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  if (d.startMin !== null && d.endMin !== null) {
    return `${date} ${minutesToInputValue(d.startMin)}-${minutesToInputValue(d.endMin)}`;
  }
  return date;
}

const actionClass =
  "rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800";
const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-stone-700 dark:bg-[#211b16]";
function StaffFormDialog({
  state,
  services,
  onChange,
  onClose,
  onSubmit,
}: {
  state: StaffFormState;
  services: ServiceView[];
  onChange: (patch: Partial<StaffFormState>) => void;
  onClose: () => void;
  onSubmit: (s: StaffFormState) => void;
}) {
  const t = useTranslations("Admin");
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="staff-form-title"
      className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 text-stone-900 shadow-xl dark:border-stone-800 dark:bg-[#1a1512] dark:text-stone-50"
    >
      <h2 id="staff-form-title" className="font-serif text-xl font-semibold">
        {state.mode === "create" ? t("addStaff") : t("editStaff")}
      </h2>
      {state.errors.form && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {state.errors.form}
        </p>
      )}
      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit(state);
        }}
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="staff-name" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              {t("name")}
            </label>
            <input
              id="staff-name"
              type="text"
              required
              maxLength={80}
              value={state.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className={inputClass}
            />
            {state.errors.name && (
              <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
                {state.errors.name}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="staff-role" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              {t("role")}
            </label>
            <input
              id="staff-role"
              type="text"
              maxLength={60}
              value={state.role}
              onChange={(e) => onChange({ role: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label htmlFor="staff-bio" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            {t("bio")}
          </label>
          <textarea
            id="staff-bio"
            rows={3}
            maxLength={500}
            value={state.bio}
            onChange={(e) => onChange({ bio: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="staff-avatar" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            {t("avatarUrl")}
          </label>
          <input
            id="staff-avatar"
            type="url"
            value={state.avatarUrl}
            onChange={(e) => onChange({ avatarUrl: e.target.value })}
            className={inputClass}
          />
          {state.errors.avatarUrl && (
            <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
              {state.errors.avatarUrl}
            </p>
          )}
        </div>
        <fieldset>
          <legend className="text-sm font-medium text-stone-700 dark:text-stone-300">
            {t("servicesPerformed")}
          </legend>
          <div className="mt-2 grid max-h-48 grid-cols-1 gap-1.5 overflow-auto rounded-lg border border-stone-200 p-3 sm:grid-cols-2 dark:border-stone-700">
            {services.map((service) => {
              const checked = state.serviceIds.includes(service.id);
              return (
                <label
                  key={service.id}
                  className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      onChange({
                        serviceIds: e.target.checked
                          ? [...state.serviceIds, service.id]
                          : state.serviceIds.filter((id) => id !== service.id),
                      })
                    }
                    className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
                  />
                  {service.name}
                </label>
              );
            })}
          </div>
        </fieldset>
        <label className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300">
          <input
            type="checkbox"
            checked={state.active}
            onChange={(e) => onChange({ active: e.target.checked })}
            className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
          />
          {t("activeStaff")}
        </label>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={state.submitting}
            className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-60 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={state.submitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state.submitting ? t("saving") : t("save")}
          </button>
        </div>
      </form>
    </dialog>
  );
}
function ScheduleDialog({
  state,
  onChange,
  onClose,
  onSubmit,
}: {
  state: ScheduleState;
  onChange: (patch: Partial<ScheduleState>) => void;
  onClose: () => void;
  onSubmit: (s: ScheduleState) => void;
}) {
  const t = useTranslations("Admin");
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  function setWindow(id: string, patch: Partial<WindowDraft>) {
    onChange({
      windows: state.windows.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    });
  }

  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="schedule-title"
      className="w-full max-w-2xl rounded-2xl border border-stone-200 bg-white p-6 text-stone-900 shadow-xl dark:border-stone-800 dark:bg-[#1a1512] dark:text-stone-50"
    >
      <h2 id="schedule-title" className="font-serif text-xl font-semibold">
        {t("scheduleTitle")}
      </h2>
      <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400">
        {t("scheduleHint", { name: state.staffName })}
      </p>
      {state.error && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      <form
        className="mt-4 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit(state);
        }}
      >
        {DAY_KEYS.map((dayKey, dayOfWeek) => (
          <fieldset key={dayKey}>
            <legend className="text-sm font-semibold text-stone-800 dark:text-stone-200">
              {t(dayKey)}
            </legend>
            <div className="mt-2 space-y-2">
              {state.windows
                .filter((w) => w.dayOfWeek === dayOfWeek)
                .map((w) => (
                  <div key={w.id} className="flex flex-wrap items-end gap-2">
                    <div>
                      <label
                        htmlFor={`win-${w.id}-start`}
                        className="block text-xs text-stone-500 dark:text-stone-400"
                      >
                        {t("start")}
                      </label>
                      <input
                        id={`win-${w.id}-start`}
                        type="time"
                        value={w.startInput}
                        onChange={(e) => setWindow(w.id, { startInput: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`win-${w.id}-end`}
                        className="block text-xs text-stone-500 dark:text-stone-400"
                      >
                        {t("end")}
                      </label>
                      <input
                        id={`win-${w.id}-end`}
                        type="time"
                        value={w.endInput}
                        onChange={(e) => setWindow(w.id, { endInput: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`win-${w.id}-bstart`}
                        className="block text-xs text-stone-500 dark:text-stone-400"
                      >
                        {t("breakStart")}
                      </label>
                      <input
                        id={`win-${w.id}-bstart`}
                        type="time"
                        value={w.breakStartInput}
                        onChange={(e) => setWindow(w.id, { breakStartInput: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`win-${w.id}-bend`}
                        className="block text-xs text-stone-500 dark:text-stone-400"
                      >
                        {t("breakEnd")}
                      </label>
                      <input
                        id={`win-${w.id}-bend`}
                        type="time"
                        value={w.breakEndInput}
                        onChange={(e) => setWindow(w.id, { breakEndInput: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onChange({ windows: state.windows.filter((x) => x.id !== w.id) })
                      }
                      className="rounded-lg border border-stone-300 px-2.5 py-2 text-sm text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                      aria-label={t("removeWindow")}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              <button
                type="button"
                onClick={() =>
                  onChange({
                    windows: [
                      ...state.windows,
                      {
                        id: nextDraftId(),
                        dayOfWeek,
                        startInput: "10:00",
                        endInput: "17:00",
                        breakStartInput: "",
                        breakEndInput: "",
                      },
                    ],
                  })
                }
                className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                + {t("addWindow")}
              </button>
            </div>
          </fieldset>
        ))}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={state.submitting}
            className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-60 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={state.submitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state.submitting ? t("saving") : t("save")}
          </button>
        </div>
      </form>
    </dialog>
  );
}
function DayOffDialog({
  state,
  onChange,
  onClose,
  onSubmit,
}: {
  state: DayOffFormState;
  onChange: (patch: Partial<DayOffFormState>) => void;
  onClose: () => void;
  onSubmit: (s: DayOffFormState) => void;
}) {
  const t = useTranslations("Admin");
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="dayoff-title"
      className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 text-stone-900 shadow-xl dark:border-stone-800 dark:bg-[#1a1512] dark:text-stone-50"
    >
      <h2 id="dayoff-title" className="font-serif text-xl font-semibold">
        {t("addDayOffTitle")}
      </h2>
      <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400">
        {t("addDayOffHint", { name: state.staffName })}
      </p>
      {state.errors.form && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {state.errors.form}
        </p>
      )}
      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit(state);
        }}
      >
        <div>
          <label htmlFor="dayoff-date" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            {t("dateLabel")}
          </label>
          <input
            id="dayoff-date"
            type="date"
            required
            value={state.dayKey}
            onChange={(e) => onChange({ dayKey: e.target.value })}
            className={inputClass}
          />
          {state.errors.dayKey && (
            <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
              {state.errors.dayKey}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="dayoff-start"
              className="block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              {t("start")} <span className="font-normal text-stone-500">({t("optional")})</span>
            </label>
            <input
              id="dayoff-start"
              type="time"
              value={state.startInput}
              onChange={(e) => onChange({ startInput: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="dayoff-end"
              className="block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              {t("end")} <span className="font-normal text-stone-500">({t("optional")})</span>
            </label>
            <input
              id="dayoff-end"
              type="time"
              value={state.endInput}
              onChange={(e) => onChange({ endInput: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
        {state.errors.endMin && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.errors.endMin}
          </p>
        )}
        <div>
          <label htmlFor="dayoff-note" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            {t("note")} <span className="font-normal text-stone-500">({t("optional")})</span>
          </label>
          <input
            id="dayoff-note"
            type="text"
            maxLength={200}
            value={state.note}
            onChange={(e) => onChange({ note: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={state.submitting}
            className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-60 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={state.submitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state.submitting ? t("saving") : t("save")}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function DeleteStaffDialog({
  state,
  onClose,
  onSubmit,
}: {
  state: DeleteState;
  onClose: () => void;
  onSubmit: (s: DeleteState) => void;
}) {
  const t = useTranslations("Admin");
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="staff-delete-title"
      className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 text-stone-900 shadow-xl dark:border-stone-800 dark:bg-[#1a1512] dark:text-stone-50"
    >
      <h2 id="staff-delete-title" className="font-serif text-xl font-semibold">
        {t("deleteStaffTitle")}
      </h2>
      <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400">
        {t("deleteStaffHint", { name: state.staffName })}
      </p>
      {state.error && (
        <div
          role="alert"
          className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
        >
          {state.error}
        </div>
      )}
      <div className="mt-6 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={state.submitting}
          className="rounded-lg border border-stone-300 px-3.5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-60 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          onClick={() => void onSubmit(state)}
          disabled={state.submitting}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state.submitting ? t("deleting") : t("delete")}
        </button>
      </div>
    </dialog>
  );
}