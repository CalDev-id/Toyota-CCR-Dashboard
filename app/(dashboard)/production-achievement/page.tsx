import ProductionAchievementRealtimeDashboard from "@/features/production-achievement/components/ProductionAchievementRealtimeDashboard";
import { getProductionAchievementDashboard } from "@/features/production-achievement/server/achievement-data";
import { requirePageAccess } from "@/lib/authorization";

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
  const role = await requirePageAccess("/production-achievement");
  const params = await searchParams;
  const dashboard = await getProductionAchievementDashboard({
    date: getSearchValue(params.date),
    shift: getSearchValue(params.shift),
  }, { initializeAutoNoProduction: true });

  return (
    <div className="w-full max-w-none p-1 md:p-1 2xl:p-1">
      <ProductionAchievementRealtimeDashboard
        key={`${dashboard.date}-${dashboard.shift}`}
        initialDashboard={dashboard}
        viewerRole={role}
      />
    </div>
  );
}
