import HomeDashboard from "@/features/home/components/HomeDashboard";
import { getHomeDashboard } from "@/features/home/services/home.service";

export const dynamic = "force-dynamic";

export default async function Home() {
  const dashboard = await getHomeDashboard();

  return <HomeDashboard dashboard={dashboard} />;
}
