import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

const minPasswordLength = 8;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseUserId(value: string) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid user id");
  }

  return id;
}

function parseUpdatePayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid request body");
  }

  const body = payload as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!name) {
    throw new Error("Name is required");
  }

  if (!email || !email.includes("@")) {
    throw new Error("Valid email is required");
  }

  if (password && password.length < minPasswordLength) {
    throw new Error(`Password must be at least ${minPasswordLength} characters`);
  }

  return { name, email, password };
}

function serializeUser(user: { id: number; name: string; email: string }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    const { id: idParam } = await context.params;
    const id = parseUserId(idParam);
    const payload = parseUpdatePayload(await request.json());
    const existingUser = await prisma.user.findFirst({
      where: {
        email: payload.email,
        NOT: { id },
      },
      select: { id: true },
    });

    if (existingUser) {
      return Response.json(
        { error: "Email is already registered" },
        { status: 409 },
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        name: payload.name,
        email: payload.email,
        ...(payload.password
          ? { passwordHash: await bcrypt.hash(payload.password, 12) }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return Response.json({ data: serializeUser(user) });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update user",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    const { id: idParam } = await context.params;
    const id = parseUserId(idParam);

    if (session.user.id === String(id)) {
      return Response.json(
        { error: "You cannot delete your own active account" },
        { status: 400 },
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return Response.json({ data: { id } });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to delete user",
      },
      { status: 400 },
    );
  }
}
