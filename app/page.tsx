import HomeDashboard from "@/features/home/components/HomeDashboard";
import { getHomeDashboard } from "@/features/home/server/home-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const dashboard = await getHomeDashboard();

  return <HomeDashboard dashboard={dashboard} />;
}
