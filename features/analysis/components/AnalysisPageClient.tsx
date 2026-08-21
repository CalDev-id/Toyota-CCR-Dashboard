"use client";

import type {
  AnalysisLineKey as LineKey,
  AnalysisResponse,
} from "@/features/analysis/types";
import { OeeLineChart } from "@/features/analysis/components/AnalysisCharts";
import OeeSummaryCard from "@/features/analysis/components/OeeSummaryCard";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const lineLabels: Record<LineKey, string> = {
  assyline: "Assy Line",
  cylblock: "Cyl Block",
  cylhead: "Cyl Head",
  crankshaft: "Crankshaft",
  camshaft: "Camshaft",
};

function OeeCardSkeleton() {
  return (
    <article className="min-h-[168px] animate-pulse rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-sm dark:border-[#273449] dark:bg-[#111827]">
      <div className="h-4 w-24 rounded bg-[#eaecf0] dark:bg-[#273449]" />
      <div className="mt-3 h-8 w-20 rounded bg-[#f2f4f7] dark:bg-[#202d40]" />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="h-12 rounded-lg bg-[#f2f4f7] dark:bg-[#202d40]" />
        <div className="h-12 rounded-lg bg-[#f2f4f7] dark:bg-[#202d40]" />
      </div>
    </article>
  );
}

function ChartSkeleton({ label }: { label: string }) {
  return (
    <article className="animate-pulse rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-sm dark:border-[#273449] dark:bg-[#111827]">
      <div className="h-4 w-28 rounded bg-[#eaecf0] dark:bg-[#273449]" />
      <p className="mt-1 text-xs font-medium text-[#98a2b3] dark:text-[#7f8a9d]">
        {label}
      </p>
      <div className="mt-4 flex h-48 items-end gap-2 rounded-xl bg-[#f9fafb] px-4 pb-4 dark:bg-[#162033]">
        {[42, 68, 54, 80, 61, 74, 48].map((height, index) => (
          <div
            key={index}
            className="flex-1 rounded-t bg-[#e4e7ec] dark:bg-[#273449]"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </article>
  );
}

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

async function readResponse(response: Response) {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error ?? "Request failed");
  }

  return body;
}

export default function AnalysisPage() {
  const [date, setDate] = useState(todayKey);
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const isRefreshingRef = useRef(false);

  const loadData = useCallback(async (options?: {
    showLoading?: boolean;
    silent?: boolean;
  }) => {
    if (isRefreshingRef.current) {
      return;
    }

    const showLoading = options?.showLoading ?? true;
    const silent = options?.silent ?? false;
    isRefreshingRef.current = true;

    if (showLoading) {
      setIsLoading(true);
    }

    if (!silent) {
      setError(null);
    }

    try {
      const params = new URLSearchParams({ date });
      const body = await readResponse(
        await fetch(`/api/analysis/oee?${params.toString()}`, {
          cache: "no-store",
        }),
      );
      setData(body.data as AnalysisResponse);
    } catch (loadError) {
      if (!silent) {
        setError(
          loadError instanceof Error ? loadError.message : "Unable to load OEE analysis",
        );
        setData(null);
      }
    } finally {
      isRefreshingRef.current = false;

      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [date]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadData({ showLoading: true });
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadData]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadData({ showLoading: false, silent: true });
      }
    }, 60000);

    return () => window.clearInterval(interval);
  }, [loadData]);

  const lines = useMemo(
    () =>
      data?.lines ??
      (Object.entries(lineLabels).map(([key, label]) => ({
        key: key as LineKey,
        label,
      })) satisfies Array<{ key: LineKey; label: string }>),
    [data?.lines],
  );

  function openDatePicker() {
    dateInputRef.current?.showPicker?.();
    dateInputRef.current?.focus();
  }

  return (
    <div className="w-full max-w-none p-1 md:p-1 2xl:p-1">
      <section className="flex flex-col gap-4 rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#101828]">Asakai Board</h2>
          <p className="mt-1 text-sm text-[#667085]">
            Line comparison from the first day of the month to selected date
          </p>
        </div>
        <label
          className="grid cursor-pointer gap-1.5 text-sm font-medium text-[#344054] md:w-56"
          onClick={openDatePicker}
        >
          Tanggal
          <input
            ref={dateInputRef}
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-10 cursor-pointer rounded-lg border border-[#d0d5dd] px-3 text-sm font-medium outline-none transition focus:border-[#465fff] focus:ring-2 focus:ring-[#ecf3ff]"
          />
        </label>
      </section>

      {error ? (
        <div className="mt-3 rounded-xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-sm font-medium text-[#b42318]">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <>
          <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
            {lines.map((line) => (
              <OeeCardSkeleton key={line.key} />
            ))}
          </section>
          <section className="mt-4 grid gap-4 xl:grid-cols-5">
            {lines.map((line) => (
              <ChartSkeleton key={line.key} label={line.label} />
            ))}
          </section>
        </>
      ) : (
        <>
          <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
            {data?.cards.length ? (
              data.cards.map((card) => <OeeSummaryCard key={card.key} card={card} />)
            ) : (
              <div className="col-span-full grid h-40 place-items-center rounded-2xl border border-[#e4e7ec] bg-white text-sm font-medium text-[#98a2b3]">
                No data
              </div>
            )}
          </section>

          <section className="mt-4">
            <OeeLineChart
              series={data?.series ?? []}
              shiftSeries={data?.shiftSeries ?? []}
              avShiftSeries={data?.avShiftSeries ?? []}
              peShiftSeries={data?.peShiftSeries ?? []}
              rqShiftSeries={data?.rqShiftSeries ?? []}
              gapSeries={data?.gapSeries ?? []}
              lines={lines}
              cards={data?.cards ?? []}
              machiningEmergencyStock={data?.machiningEmergencyStock}
            />
          </section>
        </>
      )}
    </div>
  );
}
