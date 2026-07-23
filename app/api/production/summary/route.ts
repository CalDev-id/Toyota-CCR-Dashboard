import {
  getProductionSummary,
  parseProductionSummaryFilters,
} from "@/features/production/server/production-summary";
import { getCurrentUserRole } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    if (!(await getCurrentUserRole())) {
      return Response.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const filters = parseProductionSummaryFilters(new URL(request.url));
    const data = await getProductionSummary(filters);

    return Response.json({
      data: {
        filters,
        ...data,
      },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to fetch production summary",
      },
      { status: 500 },
    );
  }
}
