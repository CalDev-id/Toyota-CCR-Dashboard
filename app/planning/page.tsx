import PlanningPageClient from "@/features/planning/components/PlanningPageClient";
import { requirePageAccess } from "@/lib/authorization";

export default async function PlanningPage() {
  await requirePageAccess("/planning");
  return <PlanningPageClient />;
}
