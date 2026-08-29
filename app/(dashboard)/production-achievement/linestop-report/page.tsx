import { requirePageAccess } from "@/lib/authorization";

export default async function LinestopReportPage() {
  await requirePageAccess("/production-achievement/linestop-report");

  return null;
}
