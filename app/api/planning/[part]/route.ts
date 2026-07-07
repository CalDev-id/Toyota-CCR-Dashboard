import {
  buildPayload,
  getPlanningColumns,
  insertPlanningRows,
  requirePlanningPart,
} from "@/features/planning/services/planning.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ part: string }> },
) {
  try {
    const { part: partParam } = await params;
    const part = requirePlanningPart(partParam);
    const columns = await getPlanningColumns(part);
    const body = (await request.json()) as Record<string, unknown>;
    const payload = buildPayload(body, columns, "create");
    const inserted = await insertPlanningRows(part, columns, [payload]);

    return Response.json({ data: { inserted } }, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create planning data",
      },
      { status: 400 },
    );
  }
}

