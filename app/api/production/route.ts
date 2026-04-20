import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

export async function GET() {
  try {
    const items = await prisma.productionItem.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    return Response.json({ data: items });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch production data",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = parseProductionPayload(await request.json());
    const item = await prisma.productionItem.create({
      data: payload,
    });

    return Response.json({ data: item }, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create production data",
      },
      { status: 400 },
    );
  }
}
