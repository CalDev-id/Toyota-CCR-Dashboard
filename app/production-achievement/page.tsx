import DefaultLayout from "@/components/layouts/DefaultLayout";
import ProductionAchievementClock from "@/features/production-achievement/components/ProductionAchievementClock";
import ProductionAchievementFilters from "@/features/production-achievement/components/ProductionAchievementFilters";
import { getProductionAchievementDashboard } from "@/features/production-achievement/services/production-achievement.service";
import ProductionAchievementCardView from "@/features/production-achievement/components/ProductionAchievementCardView";

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
