import AnalysisPageClient from "@/features/analysis/components/AnalysisPageClient";
import { requirePageAccess } from "@/lib/authorization";

export default async function AnalysisPage() {
  await requirePageAccess("/analysis");
  return <AnalysisPageClient />;
}
