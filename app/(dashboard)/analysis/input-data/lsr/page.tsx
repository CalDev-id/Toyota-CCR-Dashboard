import { requirePageAccess } from "@/lib/authorization";

export default async function InputLsrPage() {
  await requirePageAccess("/analysis/input-data/lsr");

  return <p className="text-sm text-[#667085] dark:text-[#a7b0c0]">Input LSR sedang disiapkan.</p>;
}
