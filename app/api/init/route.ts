import { initDb } from "../../../lib/init-db";

export async function GET() {
  initDb();
  return Response.json({ message: "Databasen har initierats" });
}
