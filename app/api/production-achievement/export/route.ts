import {
  createProductionAchievementDataWorkbook,
  createProductionAchievementWorkbook,
} from "@/features/production-achievement/server/achievement-export";
import { getProductionAchievementDashboard } from "@/features/production-achievement/server/achievement-data";
import { getCurrentUserRole } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    if (!(await getCurrentUserRole())) {
      return Response.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const url = new URL(request.url);
    const dashboard = await getProductionAchievementDashboard({
      date: url.searchParams.get("date"),
      shift: url.searchParams.get("shift"),
    }, {
      includeAllProblems: true,
    });
    const format = url.searchParams.get("format") === "data" ? "data" : "report";
    const workbook = format === "data"
      ? createProductionAchievementDataWorkbook(dashboard)
      : await createProductionAchievementWorkbook(dashboard);
    const filename = format === "data"
      ? `production-achievement-data_${dashboard.date}_${dashboard.shift}.xlsx`
      : `production-achievement_${dashboard.date}_${dashboard.shift}.xlsx`;

    return new Response(new Uint8Array(workbook), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to export production achievement data",
      },
      { status: 500 },
    );
  }
}
