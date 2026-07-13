import { getAnalysisOee } from "@/features/analysis/server/analysis-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await getAnalysisOee(url.searchParams.get("date"));

    return Response.json({ data });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to fetch analysis OEE",
      },
      { status: 500 },
    );
  }
}
