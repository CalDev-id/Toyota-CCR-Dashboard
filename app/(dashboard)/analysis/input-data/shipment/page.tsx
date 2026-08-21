import { requirePageAccess } from "@/lib/authorization";

export default async function InputShipmentPage() {
  await requirePageAccess("/analysis/input-data/shipment");

  return <p className="text-sm text-[#667085] dark:text-[#a7b0c0]">Input Shipment sedang disiapkan.</p>;
}
