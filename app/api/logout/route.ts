import { deleteSession } from "../../../lib/auth";

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return undefined;

  const parts = cookieHeader.split(";").map((p) => p.trim());
  const match = parts.find((p) => p.startsWith(name + "="));
  return match ? match.substring(name.length + 1) : undefined;
}

export async function POST(req: Request) {
  const cookieHeader = req.headers.get("cookie");
  const token = getCookieValue(cookieHeader, "session_token");

  deleteSession(token);

  const response = Response.json({ message: "Utloggad" });
  response.headers.append(
    "Set-Cookie",
    "session_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
  );

  return response;
}
