import ProductionPageClient from "@/features/production/components/ProductionPageClient";
import { requirePageAccess } from "@/lib/authorization";

export default async function ProductionPage() {
  await requirePageAccess("/production");
  return <ProductionPageClient />;
}
