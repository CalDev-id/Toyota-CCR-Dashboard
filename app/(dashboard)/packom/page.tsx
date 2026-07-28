import { requirePageAccess } from "@/lib/authorization";

export default async function PackomPage() {
  await requirePageAccess("/packom");
  return <section className="min-h-[240px]" />;
}
