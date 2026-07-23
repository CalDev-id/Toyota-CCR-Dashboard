import HomeDashboard from "@/features/home/components/HomeDashboard";
import { getHomeDashboard } from "@/features/home/server/home-data";
import { requirePageAccess } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export default async function Home() {
  await requirePageAccess("/");
  const dashboard = await getHomeDashboard();

  return <HomeDashboard dashboard={dashboard} />;
}
