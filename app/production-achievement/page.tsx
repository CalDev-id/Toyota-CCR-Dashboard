import DefaultLayout from "@/components/layouts/DefaultLayout";
import ProductionAchievementClock from "@/app/production-achievement/ProductionAchievementClock";
import ProductionAchievementFilters from "@/app/production-achievement/ProductionAchievementFilters";
import {
  getProductionAchievementDashboard,
  type ProductionAchievementCard,
} from "@/lib/production-achievement-server";
import Image from "next/image";

export const dynamic = "force-dynamic";

type ProductionAchievementPageProps = {
  searchParams: Promise<{
    date?: string | string[];
    shift?: string | string[];
  }>;
};

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

function meetsOeeTarget(value: number | null) {
  if (value === null) {
    return false;
  }

  return (Math.abs(value) <= 1 ? value * 100 : value) >= 90;
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

function MetricTile({
  label,
  value,
  valueClassName = "text-[#101828]",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg bg-[#f9fafb] px-3 py-2 dark:bg-[#162033]">
      <p className="text-[11px] font-medium text-[#667085] dark:text-[#a7b0c0]">
        {label}
      </p>
      <p className={`mt-1 text-base font-semibold ${valueClassName}`}>{value}</p>
    </div>
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

function ProductionAchievementCardView({
  card,
}: {
  card: ProductionAchievementCard;
}) {
  const isTargetMet = meetsOeeTarget(card.oee);
  const hasProblems = card.problems.length > 0;

  return (
    <article className="flex min-h-[500px] w-[320px] shrink-0 flex-col rounded-2xl border border-[#e4e7ec] bg-white p-4 shadow-sm dark:border-[#273449] dark:bg-[#111827] xl:w-full xl:min-w-0 xl:shrink">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-[#101828] dark:text-[#f8fafc]">
            {card.label}
          </h2>
        </div>
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
            isTargetMet
              ? "bg-[#ecfdf3] text-[#039855] dark:bg-[#062b1b] dark:text-[#75e0a7]"
              : "bg-[#fef3f2] text-[#d92d20] dark:bg-[#3b1111] dark:text-[#fda29b]"
          }`}
          aria-label={isTargetMet ? "OEE target met" : "OEE below target"}
          title={isTargetMet ? "OEE >= 90%" : "OEE < 90%"}
        >
          {isTargetMet ? (
            <svg
              viewBox="0 0 20 20"
              className="h-5 w-5"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M5 10.5l3.2 3.2L15.5 6"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.4"
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
          className="max-h-32 w-auto max-w-[88%] object-contain"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-md bg-[#f9fafb] px-2 py-1 text-[11px] font-semibold text-[#667085] dark:bg-[#162033] dark:text-[#a7b0c0]">
          TT {formatTt(card.tt)}
        </span>
        <span className="rounded-md bg-[#ecf3ff] px-2 py-1 text-[11px] font-semibold text-[#465fff] dark:bg-[#14245a] dark:text-[#8da2ff]">
          OEE Target {formatPercent(card.oeeTarget)}
        </span>
      </div>

      <div className="mt-4 grid gap-2">
        <div className="grid grid-cols-2 gap-2">
          <MetricTile label="Prod Plan" value={formatNumber(card.prodPlan)} />
          <MetricTile label="Prod Act" value={formatNumberAuto(card.prodAct)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MetricTile
            label="Balance"
            value={formatNumberAuto(card.balance)}
            valueClassName={getBalanceClass(card.balance)}
          />
          <MetricTile label="OEE" value={formatPercent(card.oee)} />
        </div>
      </div>

      <div className="mt-5 min-h-[100px]">
        {card.variants.length ? (
          <div className="rounded-xl border border-[#e4e7ec] dark:border-[#273449]">
            <table className="w-full table-fixed text-xs">
              <thead className="bg-[#f9fafb] text-[#667085] dark:bg-[#162033] dark:text-[#a7b0c0]">
                <tr>
                  <th className="w-[34%] px-3 py-2.5 text-left font-semibold">
                    Variant
                  </th>
                  <th className="w-[22%] px-2 py-2.5 text-right font-semibold">
                    Plan
                  </th>
                  <th className="w-[22%] px-2 py-2.5 text-right font-semibold">
                    Act
                  </th>
                  <th className="w-[22%] px-3 py-2.5 text-right font-semibold">
                    Bal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e7ec] dark:divide-[#273449]">
                {card.variants.map((variant) => (
                  <tr key={variant.name}>
                    <td className="truncate px-3 py-2.5 font-semibold text-[#101828] dark:text-[#f8fafc]">
                      {variant.name}
                    </td>
                    <td className="px-2 py-2.5 text-right font-medium text-[#667085] dark:text-[#a7b0c0]">
                      {formatNumber(variant.prodPlan)}
                    </td>
                    <td className="px-2 py-2.5 text-right font-medium text-[#667085] dark:text-[#a7b0c0]">
                      {formatNumberAuto(variant.prodAct)}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-semibold ${getBalanceClass(
                        variant.balance,
                      )}`}
                    >
                      {formatNumberAuto(variant.balance)}
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
        className={`mt-5 rounded-xl border px-3 py-3 ${
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
          <p className="mt-1 text-sm font-medium text-[#344054] dark:text-[#d4dae5]">
            No problem data
          </p>
        )}
      </div>
    </article>
  );
}

function getSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProductionAchievementPage({
  searchParams,
}: ProductionAchievementPageProps) {
  const params = await searchParams;
  const dashboard = await getProductionAchievementDashboard({
    date: getSearchValue(params.date),
    shift: getSearchValue(params.shift),
  });

  return (
    <DefaultLayout contentClassName="w-full max-w-none p-4 md:p-5 2xl:p-5">
      <section>
        <div className="mb-4 flex flex-col gap-3 pl-2 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-stretch gap-5">
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-[#101828] dark:text-[#f8fafc]">
                Production Achievement
              </h1>
              <p className="mt-1 text-sm font-semibold text-[#667085] dark:text-[#a7b0c0]">
                {dashboard.date}
              </p>
            </div>
            <ProductionAchievementClock />
          </div>

          <ProductionAchievementFilters
            date={dashboard.date}
            shift={dashboard.shift}
          />
        </div>

        <div className="overflow-x-auto pb-2 [scrollbar-gutter:stable] xl:overflow-visible xl:pb-0">
          <div className="grid auto-cols-[320px] grid-flow-col gap-3 xl:grid-flow-row xl:grid-cols-5 xl:auto-cols-auto">
            {dashboard.cards.map((card) => (
              <ProductionAchievementCardView key={card.key} card={card} />
            ))}
          </div>
        </div>
      </section>
    </DefaultLayout>
  );
}
