import {
  LINE_STOP_DECISIONS,
  createLineStopDecision,
  getLatestLineStopDecision,
  isMachiningLine,
} from "@/features/production-achievement/server/line-stop-decisions";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

function parseDate(value: unknown) {
  const parsed = new Date(String(value ?? ""));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseRequest(value: Record<string, unknown>) {
  const lineKey = String(value.lineKey ?? "");
  const reportDate = String(value.reportDate ?? "");
  const shift = String(value.shift ?? "");
  const sourceLastUpdatedAt = parseDate(value.sourceLastUpdatedAt);

  if (!isMachiningLine(lineKey) || !/^\d{4}-\d{2}-\d{2}$/.test(reportDate) || !["DAY", "NIGHT"].includes(shift) || !sourceLastUpdatedAt) {
    throw new Error("Invalid line stop request");
  }

  return { lineKey, reportDate, shift, sourceLastUpdatedAt };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthenticated" }, { status: 401 });

  try {
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const input = parseRequest(params);
    const decision = await getLatestLineStopDecision(
      input.lineKey,
      input.reportDate,
      input.shift,
      input.sourceLastUpdatedAt,
    );
    return Response.json({ data: decision });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load line stop decision" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthenticated" }, { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.role !== "CCR_GROUP_LEADER") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const input = parseRequest(body);
    const alertStartedAt = parseDate(body.alertStartedAt);
    const decision = String(body.decision ?? "");
    const userId = Number(session.user.id);

    if (!alertStartedAt || !LINE_STOP_DECISIONS.includes(decision as (typeof LINE_STOP_DECISIONS)[number]) || !Number.isInteger(userId)) {
      throw new Error("Invalid line stop decision");
    }

    const saved = await createLineStopDecision({
      ...input,
      alertStartedAt,
      decision: decision as (typeof LINE_STOP_DECISIONS)[number],
      decidedByUserId: userId,
      decidedByName: session.user.name?.trim() || session.user.email || "User",
    });
    return Response.json({ data: saved });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to save line stop decision" }, { status: 400 });
  }
}
