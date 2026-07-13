import {
  getFilteredPlanningRows,
  getPlanningFilterOptions,
  getPlanningColumns,
  getPlanningSummaries,
  parsePlanningPart,
  planningParts,
} from "@/features/planning/server/planning-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const part = parsePlanningPart(url.searchParams.get("part"));
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0",
    )}`;
    const filters = {
      month: url.searchParams.get("month") || defaultMonth,
      shift: url.searchParams.get("shift") || "all",
      group: url.searchParams.get("group") || "all",
    };
    const [summaries, columns] = await Promise.all([
      getPlanningSummaries(filters.month),
      getPlanningColumns(part),
    ]);
    const [rows, filterOptions] = await Promise.all([
      getFilteredPlanningRows(part, columns, filters),
      getPlanningFilterOptions(part, columns, filters.month),
    ]);

    return Response.json({
      data: {
        parts: summaries,
        activePart: part,
        activeLabel: planningParts[part].label,
        filters,
        filterOptions,
        columns,
        rows,
      },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to fetch planning data",
      },
      { status: 500 },
    );
  }
}
