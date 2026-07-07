"use client";

import DefaultLayout from "@/components/layouts/DefaultLayout";
import DailyProductionTable from "@/features/production/components/DailyProductionTable";
import DetailProblemTable from "@/features/production/components/DetailProblemTable";
import {
  BalanceCard,
  FilterSelect,
  KpiCard,
  OeeGauge,
  ProductionPlanCard,
  formatPercent,
  normalizePercent,
} from "@/features/production/components/ProductionDashboardUi";
import type {
  ProductionFilterOptions as FilterOptions,
  ProductionProblemRow as ProblemRow,
  ProductionSummaryResponse as SummaryResponse,
  ProductionSummaryRow as SummaryRow,
  ProductionTrend as Trend,
} from "@/features/production/types";
import { useCallback, useEffect, useMemo, useState } from "react";

const emptyOptions: FilterOptions = {
  shifts: [],
  shift2s: [],
  shops: [],
};

const lineOptions = [
  {
    label: "Cylinder Block",
    value: "Cylinder Block",
    aliases: ["cylinder block", "cyl block", "cylblock"],
  },
  {
    label: "Cylinder Head",
    value: "Cylinder Head",
    aliases: ["cylinder head", "cyl head", "cylhead"],
  },
  {
    label: "Camshaft",
    value: "Camshaft",
    aliases: ["camshaft", "cam shaft"],
  },
  {
    label: "Crankshaft",
    value: "Crankshaft",
    aliases: ["crankshaft", "crank shaft"],
  },
];

const defaultLine = lineOptions[0].value;

function getLineLabel(value: string) {
  return lineOptions.find((option) => option.value === value)?.label ?? value;
}

function normalizeLineName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolveShopValue(line: string, shops: string[]) {
  const selectedLine = lineOptions.find((option) => option.value === line);

  if (!selectedLine) {
    return line;
  }

  const acceptedNames = [selectedLine.value, selectedLine.label, ...selectedLine.aliases].map(
    normalizeLineName,
  );
  const matchingShop = shops.find((shop) =>
    acceptedNames.includes(normalizeLineName(shop)),
  );

  return matchingShop ?? selectedLine.value;
}

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function currentDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

async function readResponse(response: Response) {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error ?? "Request failed");
  }

  return body;
}





function makeTrend(current: number, previous: number): Trend {
  if (!Number.isFinite(previous) || previous === 0) {
    return null;
  }

  const change = ((current - previous) / Math.abs(previous)) * 100;

  return {
    direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
    value: Math.abs(change),
  };
}


function average(rows: SummaryRow[], key: "oee" | "av" | "pe" | "rq") {
  if (rows.length === 0) {
    return 0;
  }

  return rows.reduce((total, row) => total + row[key], 0) / rows.length;
}

function averageDailyTotal(rows: SummaryRow[], key: "prodAct" | "prodPlan" | "balance") {
  const grouped = new Map<string, number>();

  for (const row of rows) {
    grouped.set(row.date, (grouped.get(row.date) ?? 0) + row[key]);
  }

  const values = Array.from(grouped.values());

  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}






export default function ProductionPage() {
  const [date, setDate] = useState(currentDate);
  const [shift, setShift] = useState("all");
  const [shift2, setShift2] = useState("all");
  const [line, setLine] = useState(defaultLine);
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [monthlyRows, setMonthlyRows] = useState<SummaryRow[]>([]);
  const [problemRows, setProblemRows] = useState<ProblemRow[]>([]);
  const [filterOptions, setFilterOptions] = useState(emptyOptions);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const shop = useMemo(
    () => resolveShopValue(line, filterOptions.shops),
    [filterOptions.shops, line],
  );

  const url = useMemo(() => {
    const params = new URLSearchParams({
      line,
      date,
      month: date.slice(0, 7) || currentMonth(),
      shift,
      shift2,
      shop,
    });
    return `/api/production/summary?${params.toString()}`;
  }, [date, line, shift, shift2, shop]);

  const monthlyUrl = useMemo(() => {
    const params = new URLSearchParams({
      line,
      month: date.slice(0, 7) || currentMonth(),
      shift,
      shift2,
      shop,
    });
    return `/api/production/summary?${params.toString()}`;
  }, [date, line, shift, shift2, shop]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [body, monthlyBody] = await Promise.all([
        readResponse(await fetch(url)),
        fetch(monthlyUrl)
          .then(readResponse)
          .catch(() => ({ data: { rows: [] } })),
      ]);
      const data = body.data as SummaryResponse;
      const monthlyData = monthlyBody.data as Partial<SummaryResponse>;
      setRows(data.rows);
      setMonthlyRows(monthlyData.rows ?? []);
      setProblemRows(data.problemRows ?? []);
      setFilterOptions(data.filterOptions);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load production summary",
      );
      setRows([]);
      setMonthlyRows([]);
      setProblemRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [monthlyUrl, url]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadData]);

  const totals = useMemo(
    () => ({
      prodPlan: rows.reduce((total, row) => total + row.prodPlan, 0),
      prodAct: rows.reduce((total, row) => total + row.prodAct, 0),
      balance: rows.reduce((total, row) => total + row.balance, 0),
      oee: average(rows, "oee"),
      av: average(rows, "av"),
      pe: average(rows, "pe"),
      rq: average(rows, "rq"),
    }),
    [rows],
  );
  const monthlyAverages = useMemo(
    () => ({
      prodPlan: averageDailyTotal(monthlyRows, "prodPlan"),
      prodAct: averageDailyTotal(monthlyRows, "prodAct"),
      balance: averageDailyTotal(monthlyRows, "balance"),
      oee: average(monthlyRows, "oee"),
      av: average(monthlyRows, "av"),
      pe: average(monthlyRows, "pe"),
      rq: average(monthlyRows, "rq"),
    }),
    [monthlyRows],
  );
  const trends = useMemo(
    () => ({
      prodAct: makeTrend(totals.prodAct, monthlyAverages.prodAct),
      oee: makeTrend(normalizePercent(totals.oee), normalizePercent(monthlyAverages.oee)),
      av: makeTrend(normalizePercent(totals.av), normalizePercent(monthlyAverages.av)),
      pe: makeTrend(normalizePercent(totals.pe), normalizePercent(monthlyAverages.pe)),
      rq: makeTrend(normalizePercent(totals.rq), normalizePercent(monthlyAverages.rq)),
    }),
    [monthlyAverages, totals],
  );
  const lineLabel = getLineLabel(line);
  const problemTotals = useMemo(
    () => ({
      avMinutes: problemRows.reduce((total, row) => total + row.lsAvMin, 0),
      peMinutes: problemRows.reduce((total, row) => total + row.lsPeMin, 0),
      rqMinutes: problemRows.reduce(
        (total, row) => total + row.defectCMin + row.defectMMin,
        0,
      ),
      defectUnits: problemRows.reduce(
        (total, row) => total + row.defectC + row.defectM,
        0,
      ),
    }),
    [problemRows],
  );

  return (
    <DefaultLayout>
      <section className="rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1.5 text-sm font-medium text-[#344054]">
            Date
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-10 rounded-lg border border-[#d0d5dd] px-3 text-sm font-medium outline-none transition focus:border-[#465fff] focus:ring-2 focus:ring-[#ecf3ff]"
            />
          </label>
          <FilterSelect
            label="Line"
            value={line}
            options={lineOptions.map((option) => option.value)}
            onChange={setLine}
            includeAll={false}
          />
          <FilterSelect
            label="Shift"
            value={shift}
            options={filterOptions.shifts}
            onChange={setShift}
          />
          <FilterSelect
            label="Day / Night"
            value={shift2}
            options={filterOptions.shift2s}
            onChange={setShift2}
          />
        </div>
      </section>

      {error ? (
        <div className="mt-4 rounded-xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-sm font-medium text-[#b42318]">
          {error}
        </div>
      ) : null}

      <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard
              label="AV"
              value={formatPercent(totals.av)}
              caption="Availability"
              trend={trends.av}
              tone={normalizePercent(totals.av) >= 85 ? "good" : "warn"}
            />
            <KpiCard
              label="PE"
              value={formatPercent(totals.pe)}
              caption="Performance"
              trend={trends.pe}
              tone={normalizePercent(totals.pe) >= 85 ? "good" : "warn"}
            />
            <KpiCard
              label="RQ"
              value={formatPercent(totals.rq)}
              caption="Quality"
              trend={trends.rq}
              tone={normalizePercent(totals.rq) >= 85 ? "good" : "warn"}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ProductionPlanCard
              actual={totals.prodAct}
              plan={totals.prodPlan}
              trend={trends.prodAct}
            />
            <BalanceCard balance={totals.balance} />
          </div>
        </div>
        <OeeGauge value={totals.oee} trend={trends.oee} />
      </section>

      {isLoading ? (
        <div className="mt-6 grid h-40 place-items-center rounded-2xl border border-[#e4e7ec] bg-white text-sm font-medium text-[#667085]">
          Loading daily production summary...
        </div>
      ) : (
        <>
          <DailyProductionTable rows={rows} date={date} lineLabel={lineLabel} />

          <DetailProblemTable
            problemRows={problemRows}
            problemTotals={problemTotals}
            date={date}
          />        </>
      )}
    </DefaultLayout>
  );
}
