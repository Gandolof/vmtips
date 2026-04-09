import { getSession } from "./auth";

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return undefined;

  const parts = cookieHeader.split(";").map((p) => p.trim());
  const match = parts.find((p) => p.startsWith(name + "="));
  return match ? match.substring(name.length + 1) : undefined;
}

export function requireAdminFromRequest(req: Request) {
  const cookieHeader = req.headers.get("cookie");
  const token = getCookieValue(cookieHeader, "session_token");
  const session = getSession(token);

  if (!session) {
    return {
      ok: false as const,
      response: Response.json({ error: "Inte inloggad" }, { status: 401 }),
    };
  }

  if (session.role !== "ADMIN") {
    return {
      ok: false as const,
      response: Response.json({ error: "Adminbehörighet krävs" }, { status: 403 }),
    };
  }

  return {
    ok: true as const,
    session,
  };
}
