import PackomRealtimeDashboard from "@/features/packom/components/PackomRealtimeDashboard";
import { getPackomDashboard } from "@/features/packom/server/packom-data";
import { requirePageAccess } from "@/lib/authorization";

export const dynamic = "force-dynamic";

type PackomPageProps = {
  searchParams: Promise<{ date?: string | string[]; shift?: string | string[] }>;
};

function getSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PackomPage({ searchParams }: PackomPageProps) {
  await requirePageAccess("/packom");
  const params = await searchParams;
  const dashboard = await getPackomDashboard({
    date: getSearchValue(params.date),
    shift: getSearchValue(params.shift),
  });

  return <PackomRealtimeDashboard initialDashboard={dashboard} />;
}
