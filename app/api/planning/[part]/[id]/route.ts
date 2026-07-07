import {
  deletePlanningRow,
  getPlanningColumns,
  requirePlanningPart,
  updatePlanningRow,
} from "@/features/planning/services/planning.service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ part: string; id: string }> },
) {
  try {
    const { part: partParam, id } = await params;
    const part = requirePlanningPart(partParam);
    const columns = await getPlanningColumns(part);
    const body = (await request.json()) as Record<string, unknown>;
    await updatePlanningRow(part, columns, id, body);

    return Response.json({ data: { id } });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update planning data",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ part: string; id: string }> },
) {
  try {
    const { part: partParam, id } = await params;
    const part = requirePlanningPart(partParam);
    const columns = await getPlanningColumns(part);
    await deletePlanningRow(part, columns, id);

    return Response.json({ data: { id } });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to delete planning data",
      },
      { status: 400 },
    );
  }
}

