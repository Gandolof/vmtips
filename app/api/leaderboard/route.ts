import { getLeaderboard } from "../../../lib/queries";

export async function GET() {
  const rows = getLeaderboard();
  return Response.json(rows);
}