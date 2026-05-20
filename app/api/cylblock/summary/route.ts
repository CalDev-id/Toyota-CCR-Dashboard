import { getCylblockSummary, parseCylblockFilters } from "@/lib/cylblock-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const filters = parseCylblockFilters(new URL(request.url));
    const data = await getCylblockSummary(filters);

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
          error instanceof Error ? error.message : "Unable to fetch cylblock summary",
      },
      { status: 500 },
    );
  }
}
