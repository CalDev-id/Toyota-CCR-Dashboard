import { requirePageAccess } from "@/lib/authorization";
import AsakaiShipmentPageClient from "@/features/asakai-shipment/components/AsakaiShipmentPageClient";

export default async function InputShipmentPage() {
  await requirePageAccess("/analysis/input-data/shipment");

  return <AsakaiShipmentPageClient />;
}
