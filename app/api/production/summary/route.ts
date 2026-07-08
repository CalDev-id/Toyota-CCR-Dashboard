import {
  getProductionSummary,
  parseProductionSummaryFilters,
} from "@/features/production/server/production-summary";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
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
