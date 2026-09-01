import { getAnalysisOee } from "@/features/analysis/server/analysis-data";
import { getCurrentUserRole } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    if (!(await getCurrentUserRole())) {
      return Response.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const url = new URL(request.url);
    const date = url.searchParams.get("date");
    const data = await getAnalysisOee(
      date,
      url.searchParams.get("mode") === "realtime" ? "realtime" : "manual",
    );

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
