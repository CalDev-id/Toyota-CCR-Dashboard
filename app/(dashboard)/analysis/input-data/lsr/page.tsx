import { requirePageAccess } from "@/lib/authorization";
import InputDataPlaceholderClient from "@/features/analysis/components/InputDataPlaceholderClient";

export default async function InputLsrPage() {
  await requirePageAccess("/analysis/input-data/lsr");

  return <InputDataPlaceholderClient dataLabel="LSR" />;
}
