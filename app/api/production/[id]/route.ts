import { prisma } from "@/lib/prisma";

function parseId(value: string) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid production id");
  }

  return id;
}

function parseProductionPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid request body");
  }

  const body = payload as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const quantity = Number(body.quantity);
  const dateValue = String(body.date ?? "").trim();
  const date = new Date(`${dateValue}T00:00:00`);

  if (!name) {
    throw new Error("Name is required");
  }

  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error("Quantity must be a positive number");
  }

  if (Number.isNaN(date.getTime())) {
    throw new Error("Date must be a valid date");
  }

  return { name, quantity, date };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = parseId(idParam);
    const payload = parseProductionPayload(await request.json());
    const item = await prisma.productionItem.update({
      where: { id },
      data: payload,
    });

    return Response.json({ data: item });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update production data",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = parseId(idParam);
    await prisma.productionItem.delete({
      where: { id },
    });

    return Response.json({ data: { id } });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete production data",
      },
      { status: 400 },
    );
  }
}
