import { getProductionAchievementDashboard } from "@/features/production-achievement/server/achievement-data";
import { trackActiveProductionRealtimeStatus } from "@/features/production-achievement/server/realtime-status";

export const dynamic = "force-dynamic";

function getSearchValue(value: string | null) {
  return value || undefined;
}

export async function GET(request: Request) {
  try {
    await trackActiveProductionRealtimeStatus().catch((error) => {
      console.error("Unable to track production realtime status", error);
    });
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
