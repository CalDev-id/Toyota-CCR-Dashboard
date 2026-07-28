import HomeMetricCards from "@/features/home/components/HomeMetricCards";
import LinePerformance from "@/features/home/components/LinePerformance";
import MonthlyProductionTrend from "@/features/home/components/MonthlyProductionTrend";
import MonthlyTarget from "@/features/home/components/MonthlyTarget";
import PlanActualGapTable from "@/features/home/components/PlanActualGapTable";
import type { HomeDashboard as HomeDashboardData } from "@/features/home/types";

export default function HomeDashboard({ dashboard }: { dashboard: HomeDashboardData }) {
  return (
    <>
      <HomeMetricCards metrics={dashboard.metrics} />

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
        <MonthlyProductionTrend productionDays={dashboard.productionDays} />
        <MonthlyTarget target={dashboard.target} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <LinePerformance linePerformance={dashboard.linePerformance} />
        <PlanActualGapTable lineGaps={dashboard.lineGaps} />
      </section>
    </>
  );
}
