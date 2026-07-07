import { auth } from "@/auth";
import {
  createUser,
  getUsers,
  parseUserPayload,
} from "@/features/users/services/users.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Unauthenticated" }, { status: 401 });
  }

  return Response.json({ data: await getUsers() });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    const payload = parseUserPayload(await request.json(), "create");
    const user = await createUser(payload);

    return Response.json({ data: user }, { status: 201 });
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
