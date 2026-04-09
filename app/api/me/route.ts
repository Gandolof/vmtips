import { getSession } from "../../../lib/auth";

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return undefined;

  const parts = cookieHeader.split(";").map((p) => p.trim());
  const match = parts.find((p) => p.startsWith(name + "="));
  return match ? match.substring(name.length + 1) : undefined;
}

export async function GET(req: Request) {
  const cookieHeader = req.headers.get("cookie");
  const token = getCookieValue(cookieHeader, "session_token");
  const session = getSession(token);

  if (!session) {
    return Response.json({ user: null });
  }

  return Response.json({
    user: {
      id: session.user_id,
      name: session.name,
      email: session.email,
      role: session.role,
    },
  });
}