import { reconcileAsakaiShipment } from "@/features/asakai-shipment/server/asakai-shipment";
import { getCurrentUserRole } from "@/lib/authorization";

export const dynamic = "force-dynamic";

const recentReconciliations = new Map<string, number>();
const reconciliationIntervalMs = 5 * 60 * 1000;

export async function POST(request: Request) {
  if (!(await getCurrentUserRole())) return Response.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const month = String(body.month ?? "");
  if (!/^\d{4}-\d{2}$/.test(month)) return Response.json({ error: "Invalid month" }, { status: 400 });

  const now = Date.now();
  const lastRun = recentReconciliations.get(month) ?? 0;
  if (now - lastRun < reconciliationIntervalMs) return Response.json({ skipped: true });

  recentReconciliations.set(month, now);
  try {
    const completed = await reconcileAsakaiShipment(month);
    return Response.json({ completed });
  } catch (error) {
    recentReconciliations.delete(month);
    return Response.json({ error: error instanceof Error ? error.message : "Shipment reconciliation failed" }, { status: 500 });
  }
}
