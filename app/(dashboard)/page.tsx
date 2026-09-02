import HomeDashboard from "@/features/home/components/HomeDashboard";
import HomeDashboardSkeleton from "@/features/home/components/HomeDashboardSkeleton";
import { getHomeDashboard } from "@/features/home/server/home-data";
import { requirePageAccess } from "@/lib/authorization";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requirePageAccess("/");
  const { month } = await searchParams;

  return (
    <Suspense fallback={<HomeDashboardSkeleton />}>
      <HomeDashboardContent month={month} />
    </Suspense>
  );
}

async function HomeDashboardContent({ month }: { month?: string }) {
  const now = new Date();
  const selectedMonth = month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)
    ? month
    : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const dashboard = await getHomeDashboard(selectedMonth);

  return <HomeDashboard dashboard={dashboard} selectedMonth={selectedMonth} />;
}
