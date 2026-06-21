import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

const minPasswordLength = 8;

function parseUserPayload(payload: unknown) {
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

  if (password.length < minPasswordLength) {
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

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  return Response.json({ data: users.map(serializeUser) });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    const payload = parseUserPayload(await request.json());
    const existingUser = await prisma.user.findUnique({
      where: { email: payload.email },
      select: { id: true },
    });

    if (existingUser) {
      return Response.json(
        { error: "Email is already registered" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return Response.json({ data: serializeUser(user) }, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create user",
      },
      { status: 400 },
    );
  }
}
