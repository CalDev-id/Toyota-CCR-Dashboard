import { requirePageAccess } from "@/lib/authorization";
import LsrPageClient from "@/features/lsr/components/LsrPageClient";

export default async function InputLsrPage() {
  await requirePageAccess("/analysis/input-data/lsr");

  return <LsrPageClient />;
}
