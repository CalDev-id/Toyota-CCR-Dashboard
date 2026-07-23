import DefaultLayout from "@/components/layouts/DefaultLayout";
import { requirePageAccess } from "@/lib/authorization";

export default async function PackomPage() {
  await requirePageAccess("/packom");
  return (
    <DefaultLayout>
      <section className="min-h-[240px]" />
    </DefaultLayout>
  );
}
