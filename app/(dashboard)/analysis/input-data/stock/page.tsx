import { requirePageAccess } from "@/lib/authorization";
import AsakaiStockPageClient from "@/features/asakai-stock/components/AsakaiStockPageClient";

export default async function InputStockPage() {
  await requirePageAccess("/analysis/input-data/stock");

  return <AsakaiStockPageClient />;
}
