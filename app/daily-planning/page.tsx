import DailyPlanningClient from "@/features/daily-planning/DailyPlanningClient";
import { requirePageAccess } from "@/lib/authorization";

export default async function DailyPlanningPage() {
  await requirePageAccess("/daily-planning");
  return <DailyPlanningClient />;
}
