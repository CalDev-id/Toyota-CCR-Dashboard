import { requirePageAccess } from "@/lib/authorization";
import LinestopReportPageClient from "@/features/linestop-report/components/LinestopReportPageClient";

export default async function LinestopReportPage() {
  const role = await requirePageAccess("/production-achievement/linestop-report");

  return <LinestopReportPageClient viewerRole={role} />;
}
