import DefaultLayout from "@/components/layouts/DefaultLayout";
import ProductionAchievementRealtimeDashboard from "@/features/production-achievement/components/ProductionAchievementRealtimeDashboard";
import { getProductionAchievementDashboard } from "@/features/production-achievement/server/achievement-data";

export const dynamic = "force-dynamic";

type ProductionAchievementPageProps = {
  searchParams: Promise<{
    date?: string | string[];
    shift?: string | string[];
  }>;
};

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
      <ProductionAchievementRealtimeDashboard
        key={`${dashboard.date}-${dashboard.shift}`}
        initialDashboard={dashboard}
      />
    </DefaultLayout>
  );
}
