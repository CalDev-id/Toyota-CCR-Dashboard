import AnalysisPageClient from "@/features/analysis/components/AnalysisPageClient";
import { requirePageAccess } from "@/lib/authorization";

export default async function AnalysisManualPage() {
  await requirePageAccess("/analysis");
  return <AnalysisPageClient mode="manual" />;
}
