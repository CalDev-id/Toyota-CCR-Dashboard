import type { ProductionAchievementCard } from "@/features/production-achievement/types";
import Image from "next/image";
import type { ReactNode } from "react";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumberAuto(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(Math.abs(value) <= 1 ? value * 100 : value)}%`;
}

function formatTt(value: string) {
  return value.trim() || "-";
}

function formatStopTime(value: number) {
  return `${formatNumberAuto(value)} min`;
}

function formatLastUpdated(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function meetsOeeTarget(value: number | null, target: number | null) {
  if (value === null || target === null) {
    return false;
  }

  const normalizedValue = Math.abs(value) <= 1 ? value * 100 : value;
  const normalizedTarget = Math.abs(target) <= 1 ? target * 100 : target;

  return normalizedValue >= normalizedTarget;
}

function getOeeTargetClass(value: number | null, target: number | null) {
  if (value === null || target === null) {
    return "text-[#b42318]";
  }

  const normalizedValue = Math.abs(value) <= 1 ? value * 100 : value;
  const normalizedTarget = Math.abs(target) <= 1 ? target * 100 : target;

  return normalizedValue >= normalizedTarget ? "text-[#027a48]" : "text-[#b42318]";
}

function getBalanceClass(value: number) {
  if (value < 0) {
    return "text-[#b42318]";
  }

  if (value > 0) {
    return "text-[#027a48]";
  }

  return "text-[#344054]";
}

function getOvertimeClass(actual: number, plan: number) {
  return actual < plan ? "text-[#b42318]" : "text-[#101828]";
}

function MetricTile({
  label,
  value,
  valueClassName = "text-[#101828]",
  valueSizeClassName = "text-lg",
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
  valueSizeClassName?: string;
}) {
  return (
    <div className="flex min-h-[64px] flex-col justify-between rounded-lg bg-[#f9fafb] px-3 py-2.5 dark:bg-[#162033]">
      <p className="whitespace-pre-line text-xs font-semibold text-[#667085] dark:text-[#a7b0c0]">
        {label}
      </p>
      <p
        className={`whitespace-nowrap text-right font-semibold leading-none tracking-normal ${valueSizeClassName} ${valueClassName}`}
      >
        {value}
      </p>
    </div>
  );
}

function OeeMetricValue({
  value,
  target,
}: {
  value: number | null;
  target: number | null;
}) {
  return (
    <span className="whitespace-nowrap text-xl leading-none">
      {formatPercent(value)}
      <span className="ml-1 text-xs font-semibold opacity-75">
        / {formatPercent(target)}
      </span>
    </span>
  );
}

function TaktTimeMetricValue({
  actual,
  plan,
}: {
  actual: string;
  plan: string;
}) {
  return (
    <span className="whitespace-nowrap text-xl leading-none">
      {formatTt(actual)}
      <span className="ml-1 text-xs font-semibold opacity-75">
        / {formatTt(plan)}
      </span>
    </span>
  );
}

function ProductionMetricValue({ actual, plan }: { actual: number; plan: number }) {
  return (
    <span className="whitespace-nowrap text-[1.65rem] leading-none">
      {formatNumberAuto(actual)}
      <span className="ml-1 text-base font-semibold opacity-75">
        / {formatNumber(plan)}
      </span>
    </span>
  );
}

function OvertimeMetricValue({ actual, plan }: { actual: number; plan: number }) {
  return (
    <span className="whitespace-nowrap text-xl leading-none">
      {formatNumberAuto(actual)}
      <span className="ml-1 text-xs font-semibold opacity-75">
        / {formatNumberAuto(plan)}
      </span>
    </span>
  );
}

function ProblemTypeBadge({ type }: { type?: "AV" | "PE" | "RQ" }) {
  if (!type) {
    return null;
  }

  const className =
    type === "AV"
      ? "bg-[#fef3f2] text-[#b42318] dark:bg-[#3b1111] dark:text-[#fda29b]"
      : type === "PE"
        ? "bg-[#fffaeb] text-[#b54708] dark:bg-[#3a2604] dark:text-[#fdb022]"
        : "bg-[#ecf3ff] text-[#465fff] dark:bg-[#14245a] dark:text-[#8da2ff]";

  return (
    <span
      className={`grid h-5 min-w-6 shrink-0 place-items-center rounded px-1.5 text-[10px] font-bold ${className}`}
    >
      {type}
    </span>
  );
}

export default function ProductionAchievementCardView({
  card,
}: {
  card: ProductionAchievementCard;
}) {
  const isTargetMet = meetsOeeTarget(card.oee, card.oeeTarget);
  const targetLabel = formatPercent(card.oeeTarget);
  const hasProblems = card.problems.length > 0;

  return (
    <article className="flex min-h-[500px] w-[320px] shrink-0 flex-col rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-sm dark:border-[#273449] dark:bg-[#111827] xl:w-full xl:min-w-0 xl:shrink">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-[#101828] dark:text-[#f8fafc]">
            {card.label}
          </h2>
          {card.key !== "assy" ? (
            <p className="mt-1 text-xs font-medium text-[#667085] dark:text-[#a7b0c0]">
              Last updated: {formatLastUpdated(card.lastUpdatedAt)}
            </p>
          ) : null}
        </div>
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
            isTargetMet
              ? "bg-[#ecfdf3] text-[#039855] dark:bg-[#062b1b] dark:text-[#75e0a7]"
              : "bg-[#fef3f2] text-[#d92d20] dark:bg-[#3b1111] dark:text-[#fda29b]"
          }`}
          aria-label={isTargetMet ? "OEE target met" : "OEE below target"}
          title={isTargetMet ? `OEE >= ${targetLabel}` : `OEE < ${targetLabel}`}
        >
          {isTargetMet ? (
            <svg
              viewBox="0 0 20 20"
              className="h-5 w-5"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="10"
                cy="10"
                r="5.75"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          ) : (
            <svg
              viewBox="0 0 20 20"
              className="h-5 w-5"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 6l8 8M14 6l-8 8"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2.4"
              />
            </svg>
          )}
        </span>
      </div>

      <div className="mt-4 grid h-36 place-items-center rounded-xl bg-[#f9fafb] dark:bg-[#162033]">
        <Image
          src={card.imageSrc}
          alt={`${card.label} production part`}
          width={220}
          height={150}
          loading="eager"
          className="max-h-32 w-auto max-w-[88%] object-contain"
        />
      </div>

      <div className="mt-4 grid gap-2">
        <div className="grid grid-cols-2 gap-2">
          <MetricTile
            label="Prod."
            value={<ProductionMetricValue actual={card.prodAct} plan={card.prodPlan} />}
            valueSizeClassName="text-2xl"
          />
          <MetricTile
            label="OEE"
            value={<OeeMetricValue value={card.oee} target={card.oeeTarget} />}
            valueClassName={getOeeTargetClass(card.oee, card.oeeTarget)}
            valueSizeClassName="text-xl"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MetricTile
            label="Balance"
            value={formatNumber(card.balance)}
            valueClassName={getBalanceClass(card.balance)}
            valueSizeClassName="text-xl"
          />
          <MetricTile
            label="Overtime"
            value={<OvertimeMetricValue actual={card.otAct} plan={card.otPlan} />}
            valueClassName={getOvertimeClass(card.otAct, card.otPlan)}
            valueSizeClassName="text-xl"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MetricTile
            label="Takt Time"
            value={<TaktTimeMetricValue actual={card.ttAct} plan={card.ttPlan} />}
            valueSizeClassName="text-xl"
          />
          <MetricTile
            label="Stop Time"
            value={formatStopTime(card.stopTime)}
            valueSizeClassName="text-lg"
          />
        </div>
      </div>

      <div className="mt-5 min-h-[100px]">
        {card.variants.length ? (
          <div className="overflow-hidden rounded-xl border border-[#e4e7ec] dark:border-[#273449]">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-[#f9fafb] text-[#667085] dark:bg-[#162033] dark:text-[#a7b0c0]">
                <tr>
                  <th className="w-[34%] px-4 py-2.5 text-left font-semibold">
                    Type
                  </th>
                  <th className="w-[22%] px-3 py-2.5 text-right font-semibold">
                    Plan
                  </th>
                  <th className="w-[22%] px-3 py-2.5 text-right font-semibold">
                    Act
                  </th>
                  <th className="w-[22%] px-4 py-2.5 text-right font-semibold">
                    Bal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e7ec] dark:divide-[#273449]">
                {card.variants.map((variant) => (
                  <tr key={variant.name}>
                    <td className="truncate px-4 py-2.5 font-semibold text-[#101828] dark:text-[#f8fafc]">
                      {variant.name}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-[#667085] dark:text-[#a7b0c0]">
                      {formatNumber(variant.prodPlan)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-[#667085] dark:text-[#a7b0c0]">
                      {formatNumberAuto(variant.prodAct)}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-semibold ${getBalanceClass(
                        variant.balance,
                      )}`}
                    >
                      {formatNumber(variant.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid h-full place-items-center rounded-xl border border-dashed border-[#d0d5dd] px-3 py-4 text-center text-xs font-medium text-[#98a2b3] dark:border-[#384860] dark:text-[#7f8a9d]">
            No variant breakdown
          </div>
        )}
      </div>

      <div
        className={`mt-5 min-h-[122px] rounded-xl border px-3 py-3 ${
          hasProblems
            ? "border-[#fecdca] bg-[#fffbfa] dark:border-[#7a271a] dark:bg-[#3b1111]"
            : "border-[#e4e7ec] bg-[#f9fafb] dark:border-[#273449] dark:bg-[#162033]"
        }`}
      >
        <p
          className={`text-xs font-semibold uppercase tracking-wide ${
            hasProblems
              ? "text-[#b42318] dark:text-[#fda29b]"
              : "text-[#667085] dark:text-[#a7b0c0]"
          }`}
        >
          Problem
        </p>
        {hasProblems ? (
          <ol className="mt-2 space-y-1.5">
            {card.problems.slice(0, 3).map((problem, index) => {
              const unit = problem.unit ? ` ${problem.unit}` : "";

              return (
                <li
                  key={`${problem.label}-${problem.value}-${index}`}
                  className="flex gap-2 text-sm font-medium text-[#344054] dark:text-[#d4dae5]"
                >
                  <ProblemTypeBadge type={problem.type} />
                  <span className="min-w-0 flex-1 truncate" title={problem.label}>
                    {problem.label}
                  </span>
                  <span className="shrink-0 font-semibold">
                    {formatNumberAuto(problem.value)}
                    {unit}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-8 text-center text-sm font-medium text-[#344054] dark:text-[#d4dae5]">
            No problem data
          </p>
        )}
      </div>
    </article>
  );
}
