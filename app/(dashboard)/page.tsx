import HomeDashboard from "@/features/home/components/HomeDashboard";
import HomeDashboardSkeleton from "@/features/home/components/HomeDashboardSkeleton";
import { getHomeDashboard } from "@/features/home/server/home-data";
import { requirePageAccess } from "@/lib/authorization";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function Home() {
  await requirePageAccess("/");

  return (
    <Suspense fallback={<HomeDashboardSkeleton />}>
      <HomeDashboardContent />
    </Suspense>
  );
}

async function HomeDashboardContent() {
  const dashboard = await getHomeDashboard();

  return <HomeDashboard dashboard={dashboard} />;
}
