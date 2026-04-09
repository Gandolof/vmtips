import { db } from "../../../lib/db";
import { initDb } from "../../../lib/init-db";
import bcrypt from "bcrypt";

export async function GET() {
  initDb();

  const existingUsers = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };

  if (existingUsers.count === 0) {
    const password = await bcrypt.hash("test123", 10);

    db.prepare(`
      INSERT INTO users (name, email, password, role)
      VALUES (?, ?, ?, ?)
    `).run("Bjorn", "bjorn@example.com", password, "ADMIN");

    db.prepare(`
      INSERT INTO users (name, email, password, role)
      VALUES (?, ?, ?, ?)
    `).run("Anna", "anna@example.com", password, "USER");
  }

  const existingTeams = db.prepare("SELECT COUNT(*) as count FROM teams").get() as { count: number };

  if (existingTeams.count === 0) {
    db.prepare(`INSERT INTO teams (name, code, group_name) VALUES ('Mexico', 'MEX', 'A')`).run();
    db.prepare(`INSERT INTO teams (name, code, group_name) VALUES ('Canada', 'CAN', 'B')`).run();
    db.prepare(`INSERT INTO teams (name, code, group_name) VALUES ('United States', 'USA', 'D')`).run();
  }

  const existingSettings = db.prepare("SELECT COUNT(*) as count FROM settings").get() as { count: number };

  if (existingSettings.count === 0) {
    db.prepare(`
      INSERT INTO settings (predictions_lock_at)
      VALUES (?)
    `).run("2026-06-11T20:00:00Z");
  }

  return Response.json({ message: "Testdata har lagts in" });
}
