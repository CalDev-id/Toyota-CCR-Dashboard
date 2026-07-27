"use client";

import ProductionAchievementCardView from "@/features/production-achievement/components/ProductionAchievementCardView";
import ProductionAchievementClock from "@/features/production-achievement/components/ProductionAchievementClock";
import ProductionAchievementFilters from "@/features/production-achievement/components/ProductionAchievementFilters";
import type { ProductionAchievementDashboard, ProductionAchievementCard, ProductionLineStopDecision } from "@/features/production-achievement/types";
import type { UserRole } from "@/features/users/types";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type ProductionAchievementRealtimeDashboardProps = {
  initialDashboard: ProductionAchievementDashboard;
  viewerRole: UserRole;
};

type Alarm = { card: ProductionAchievementCard; alertStartedAt: string };
type DecisionResponse = ProductionLineStopDecision & { sourceLastUpdatedAt: string; alertStartedAt: string };
const machiningKeys = new Set(["cylblock", "cylhead", "crankshaft", "camshaft"]);
const LINE_STOP_ALERT_WORK_MINUTES = 15;
const lineIconSources = {
  assy: "/images/icon/assyicon.png",
  cylblock: "/images/icon/chicon.png",
  cylhead: "/images/icon/cbicon.png",
  crankshaft: "/images/icon/cricon.png",
  camshaft: "/images/icon/camicon.png",
} as const;

function slotDate(reportDate: string, time: string, shift: string) {
  const [year, month, day] = reportDate.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const value = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (shift === "NIGHT" && hour < 12) value.setDate(value.getDate() + 1);
  return value;
}

function workMinutesSince(card: ProductionAchievementCard, reportDate: string, shift: string, from: Date, now: Date) {
  let minutes = 0;
  let isWorkingNow = false;
  for (const slot of card.workSchedule) {
    const start = slotDate(reportDate, slot.start, shift);
    const end = slotDate(reportDate, slot.end, shift);
    if (end <= start) end.setDate(end.getDate() + 1);
    if (now >= start && now < end) isWorkingNow = true;
    const overlapStart = new Date(Math.max(start.getTime(), from.getTime()));
    const overlapEnd = new Date(Math.min(end.getTime(), now.getTime()));
    if (overlapEnd > overlapStart) minutes += (overlapEnd.getTime() - overlapStart.getTime()) / 60000;
  }
  return { minutes, isWorkingNow };
}

async function fetchLineStopDecision(card: ProductionAchievementCard, date: string, shift: string) {
  if (!card.lastUpdatedAt) return null;
  const params = new URLSearchParams({ lineKey: card.key, reportDate: date, shift, sourceLastUpdatedAt: card.lastUpdatedAt });
  const response = await fetch(`/api/production-achievement/line-stop?${params}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load line stop decision");
  const body = await response.json();
  return body.data as DecisionResponse | null;
}

function parseDashboardDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseDashboardDate(value));
}

function formatWeekday(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
  }).format(parseDashboardDate(value));
}

function formatShiftLabel(value: string) {
  return value.toUpperCase() === "NIGHT" ? "Night" : "Day";
}

async function fetchDashboard(date: string, shift: string) {
  const params = new URLSearchParams({ date, shift });
  const response = await fetch(`/api/production-achievement?${params.toString()}`, {
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error ?? "Unable to refresh production achievement data");
  }

  return body.data as ProductionAchievementDashboard;
}

export default function ProductionAchievementRealtimeDashboard({
  initialDashboard,
  viewerRole,
}: ProductionAchievementRealtimeDashboardProps) {
  const [dashboard, setDashboard] =
    useState<ProductionAchievementDashboard>(initialDashboard);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const filterRequestRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [decisions, setDecisions] = useState<Record<string, DecisionResponse>>({});
  const [isSoundBlocked, setIsSoundBlocked] = useState(false);
  const [isSavingDecision, setIsSavingDecision] = useState(false);
  const canDecide = viewerRole === "ADMIN" || viewerRole === "CCR_GROUP_LEADER";

  const alarms = useMemo(() => dashboard.cards.flatMap((card): Alarm[] => {
    if (!machiningKeys.has(card.key) || !card.lastUpdatedAt || card.workSchedule.length === 0) return [];
    const lastUpdated = new Date(card.lastUpdatedAt);
    if (Number.isNaN(lastUpdated.getTime()) || lastUpdated > now) return [];
    const decision = decisions[card.key];
    if (decision && decision.sourceLastUpdatedAt !== card.lastUpdatedAt) return [];
    if (
      decision?.decision === "LINE_STOP"
      || decision?.decision === "CHOKOTEI"
      || decision?.decision === "NO_PRODUCTION"
    ) return [];
    const reference = decision?.decision === "RUNNING" ? new Date(decision.decidedAt) : lastUpdated;
    const elapsed = workMinutesSince(card, dashboard.date, dashboard.shift, reference, now);
    return elapsed.isWorkingNow && elapsed.minutes >= LINE_STOP_ALERT_WORK_MINUTES ? [{ card, alertStartedAt: decision?.decision === "RUNNING" ? decision.decidedAt : card.lastUpdatedAt }] : [];
  }), [dashboard, decisions, now]);

  const displayedDecisions = useMemo(() => Object.fromEntries(
    Object.entries(decisions).filter(([key, decision]) => dashboard.cards.some((card) => card.key === key && card.lastUpdatedAt === decision.sourceLastUpdatedAt)),
  ), [dashboard.cards, decisions]);

  async function handleFilterChange(next: { date?: string; shift?: string }) {
    const requestId = ++filterRequestRef.current;
    const nextDate = next.date ?? dashboard.date;
    const nextShift = next.shift ?? dashboard.shift;
    const params = new URLSearchParams({ date: nextDate, shift: nextShift });

    window.history.replaceState(
      null,
      "",
      `/production-achievement?${params.toString()}`,
    );
    setIsFilterLoading(true);

    try {
      const nextDashboard = await fetchDashboard(nextDate, nextShift);

      if (requestId === filterRequestRef.current) {
        setDashboard(nextDashboard);
      }
    } catch {
      // Keep the last successful snapshot visible if a filter refresh fails.
    } finally {
      if (requestId === filterRequestRef.current) {
        setIsFilterLoading(false);
      }
    }
  }

  useEffect(() => {
    let isActive = true;

    const refreshDashboard = async () => {
      try {
        const nextDashboard = await fetchDashboard(dashboard.date, dashboard.shift);

        if (isActive) {
          setDashboard(nextDashboard);
        }
      } catch {
        // Keep the last successful snapshot visible if a refresh fails.
      }
    };

    const interval = window.setInterval(() => {
      void refreshDashboard();
      setNow(new Date());
    }, 30000);

    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, [dashboard.date, dashboard.shift]);

  useEffect(() => {
    const candidates = dashboard.cards.filter((card) => {
      if (!machiningKeys.has(card.key) || !card.lastUpdatedAt || card.workSchedule.length === 0) return false;
      const elapsed = workMinutesSince(card, dashboard.date, dashboard.shift, new Date(card.lastUpdatedAt), now);
      return elapsed.isWorkingNow && elapsed.minutes >= LINE_STOP_ALERT_WORK_MINUTES;
    });
    if (!candidates.length) return;
    let active = true;
    const load = async () => {
      const loaded = await Promise.all(candidates.map(async (card) => [card.key, await fetchLineStopDecision(card, dashboard.date, dashboard.shift)] as const));
      if (!active) return;
      setDecisions((current) => {
        const next = { ...current };
        for (const [key, decision] of loaded) {
          if (decision) next[key] = decision;
        }
        return next;
      });
    };
    void load();
    const interval = window.setInterval(() => void load(), 30000);
    return () => { active = false; window.clearInterval(interval); };
  }, [dashboard, now]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (canDecide && alarms.length > 0) {
      void audio.play().then(() => setIsSoundBlocked(false)).catch(() => setIsSoundBlocked(true));
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [alarms.length, canDecide]);

  function enableAlarmSound() {
    const audio = audioRef.current;
    if (!audio) return;
    void audio.play().then(() => setIsSoundBlocked(false)).catch(() => setIsSoundBlocked(true));
  }

  async function saveDecision(alarm: Alarm, decision: DecisionResponse["decision"]) {
    setIsSavingDecision(true);
    try {
      const response = await fetch("/api/production-achievement/line-stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineKey: alarm.card.key, reportDate: dashboard.date, shift: dashboard.shift, sourceLastUpdatedAt: alarm.card.lastUpdatedAt, alertStartedAt: alarm.alertStartedAt, decision }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to save decision");
      if (body.data) setDecisions((current) => ({ ...current, [alarm.card.key]: body.data }));
    } finally {
      setIsSavingDecision(false);
    }
  }

  return (
    <section>
      <audio ref={audioRef} src="/audio/line_stop.mp3" loop preload="auto" />
      <div className="mb-4 min-h-[118px] rounded-2xl border border-[#e4e7ec] bg-white px-4 py-5 shadow-sm dark:border-[#273449] dark:bg-[#111827]">
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,1fr)_auto_auto] lg:items-center">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-[#101828] dark:text-[#f8fafc] md:text-3xl">
              Production Achievement ({formatShiftLabel(dashboard.shift)})
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2.5 text-sm font-semibold text-[#667085] dark:text-[#a7b0c0]">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="size-4 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              >
                <path d="M8 2v4" />
                <path d="M16 2v4" />
                <path d="M3 10h18" />
                <rect width="18" height="18" x="3" y="4" rx="2" />
              </svg>
              <span>{formatDisplayDate(dashboard.date)}</span>
              <span className="text-[#d0d5dd] dark:text-[#384860]">•</span>
              <span>{formatWeekday(dashboard.date)}</span>
            </div>
          </div>

          <ProductionAchievementFilters
            date={dashboard.date}
            shift={dashboard.shift}
            onFilterChange={(next) => {
              void handleFilterChange(next);
            }}
          />

          <ProductionAchievementClock />

        </div>
      </div>

      <div className="relative">
        <div
          className={`overflow-x-auto pb-2 [scrollbar-gutter:stable] transition-opacity xl:overflow-visible xl:pb-0 ${
            isFilterLoading ? "pointer-events-none opacity-40" : ""
          }`}
        >
          <div className="grid auto-cols-[320px] grid-flow-col gap-3 xl:grid-flow-row xl:grid-cols-5 xl:auto-cols-auto">
            {dashboard.cards.map((card) => (
              <ProductionAchievementCardView key={card.key} card={card} lineStopDecision={displayedDecisions[card.key]} />
            ))}
          </div>
        </div>

        {isFilterLoading ? (
          <div className="absolute inset-0 grid place-items-center rounded-2xl bg-white/45 backdrop-blur-[1px] dark:bg-[#101828]/45">
            <div className="flex items-center gap-2 rounded-full border border-[#d0d5dd] bg-white px-4 py-2 text-sm font-semibold text-[#344054] shadow-sm dark:border-[#384860] dark:bg-[#162033] dark:text-[#d4dae5]">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="size-4 animate-spin text-[#465fff]"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeOpacity="0.25"
                  strokeWidth="3"
                />
                <path
                  d="M12 3a9 9 0 0 1 9 9"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="3"
                />
              </svg>
              Updating data...
            </div>
          </div>
        ) : null}
      </div>
      {canDecide && alarms.length > 0 ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#101828]/55 p-4" role="dialog" aria-modal="true" aria-labelledby="line-stop-title">
          <div className="w-full max-w-xl rounded-2xl border border-[#873b43] bg-white p-5 shadow-2xl dark:border-[#873b43] dark:bg-[#111827]">
            <div className="relative overflow-hidden rounded-xl border border-[#f1d5d8] bg-[linear-gradient(120deg,#fff7f7_0%,#ffffff_56%,#f8fafc_100%)] px-4 py-4 dark:border-[#542b35] dark:bg-[linear-gradient(120deg,#24151c_0%,#111827_62%,#162033_100%)]">
              <Image
                src={lineIconSources[alarms[0].card.key]}
                alt=""
                width={210}
                height={150}
                className="pointer-events-none absolute -right-4 -top-5 h-36 w-48 object-contain opacity-35 dark:opacity-40"
              />
              <div className="relative max-w-[76%]">
                <p className="text-sm font-bold tracking-wide text-[#b42318]">LINE STOP ALERT</p>
                <h2 id="line-stop-title" className="mt-1 text-xl font-semibold text-[#101828] dark:text-white">
                  <span className="block">{alarms[0].card.label} tidak</span>
                  <span className="block">update ≥ {LINE_STOP_ALERT_WORK_MINUTES} menit kerja</span>
                </h2>
                <p className="mt-2 text-sm text-[#667085] dark:text-[#a7b0c0]">Tentukan decision. PIC lain akan menerima status yang sama pada pengecekan berikutnya.</p>
              </div>
            </div>
            {isSoundBlocked ? <button type="button" onClick={enableAlarmSound} className="mt-4 rounded-lg border border-[#f04438] px-3 py-2 text-sm font-semibold text-[#b42318]">Aktifkan suara alarm</button> : null}
            <div className="mt-5 grid grid-cols-4 gap-2">
              {([
                ["RUNNING", "border border-[#1d704d] bg-[linear-gradient(120deg,#101b2a_18%,#06452f_100%)] text-[#b7f7cf] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-[#2ba86d] hover:from-[#132137] hover:to-[#07583b]"],
                ["CHOKOTEI", "border border-[#8a5b24] bg-[linear-gradient(120deg,#101b2a_18%,#5c310c_100%)] text-[#ffe0ad] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-[#c77b25] hover:from-[#132137] hover:to-[#733d0d]"],
                ["LINE_STOP", "border border-[#873b43] bg-[linear-gradient(120deg,#101b2a_18%,#581d2a_100%)] text-[#ffc4c7] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-[#c8515b] hover:from-[#132137] hover:to-[#6b2230]"],
                ["NO_PRODUCTION", "border border-[#475467] bg-[linear-gradient(120deg,#101b2a_18%,#344054_100%)] text-[#d0d5dd] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-[#667085] hover:from-[#132137] hover:to-[#475467]"],
              ] as const).map(([decision, colorClass]) => (
                <button
                  key={decision}
                  type="button"
                  disabled={isSavingDecision}
                  onClick={() => void saveDecision(alarms[0], decision)}
                  className={`rounded-xl px-3 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${colorClass}`}
                >
                  {decision === "NO_PRODUCTION" ? <>NO<br />PRODUCTION</> : decision.replaceAll("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
