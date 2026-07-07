import { auth } from "@/auth";
import {
  deleteUser,
  parseUserId,
  parseUserPayload,
  updateUser,
} from "@/features/users/services/users.service";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    const { id: idParam } = await context.params;
    const id = parseUserId(idParam);
    const payload = parseUserPayload(await request.json(), "update");
    const user = await updateUser(id, payload);

    return Response.json({ data: user });
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

    return Response.json({ data: await deleteUser(id) });
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
