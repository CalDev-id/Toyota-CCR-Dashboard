import { getProductionAchievementDashboard } from "@/features/production-achievement/server/achievement-data";

export const dynamic = "force-dynamic";

function getSearchValue(value: string | null) {
  return value || undefined;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const dashboard = await getProductionAchievementDashboard({
      date: getSearchValue(url.searchParams.get("date")),
      shift: getSearchValue(url.searchParams.get("shift")),
    });

    return Response.json({ data: dashboard });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch production achievement data",
      },
      { status: 500 },
    );
  }
}
