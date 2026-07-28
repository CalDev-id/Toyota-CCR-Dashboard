import DefaultLayout from "@/components/layouts/DefaultLayout";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <DefaultLayout>{children}</DefaultLayout>;
}
