import { createLinestopWorkbook, linestopWorkbookContentType } from "@/features/linestop-report/server/linestop-export";
import { getLinestopReport } from "@/features/linestop-report/server/linestop-report";
import { getCurrentUserRole } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    if (!(await getCurrentUserRole())) return Response.json({ error: "Unauthenticated" }, { status: 401 });
    const month = new URL(request.url).searchParams.get("month") ?? "";
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return Response.json({ error: "Bulan tidak valid" }, { status: 400 });
    const workbook = createLinestopWorkbook(await getLinestopReport(month), month);
    return new Response(new Uint8Array(workbook), { headers: { "Cache-Control": "no-store", "Content-Disposition": `attachment; filename="linestop-report_${month}.xlsx"`, "Content-Type": linestopWorkbookContentType } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to export Linestop Report" }, { status: 500 });
  }
}
