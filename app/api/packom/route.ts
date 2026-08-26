import { getPackomDashboard } from "@/features/packom/server/packom-data";
import { getCurrentUserRole } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const role = await getCurrentUserRole();
    if (!role) {
      return Response.json({ error: "Unauthenticated" }, { status: 401 });
    }
    if (role === "USER") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    return Response.json({
      data: await getPackomDashboard({
        date: url.searchParams.get("date"),
        shift: url.searchParams.get("shift"),
      }),
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to fetch packom data" }, { status: 500 });
  }
}
