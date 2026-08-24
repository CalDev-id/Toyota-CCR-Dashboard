import { requirePageAccess } from "@/lib/authorization";
import InputDataPlaceholderClient from "@/features/analysis/components/InputDataPlaceholderClient";

export default async function InputShipmentPage() {
  await requirePageAccess("/analysis/input-data/shipment");

  return <InputDataPlaceholderClient dataLabel="Shipment" />;
}
