import { db } from "./db";
import crypto from "crypto";

export function createSession(userId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(); // 30 days

  db.prepare(`
    INSERT INTO sessions (token, user_id, expires_at)
    VALUES (?, ?, ?)
  `).run(token, userId, expiresAt);

  return { token, expiresAt };
}

export function getSession(token: string | undefined) {
  if (!token) return null;

  const session = db.prepare(`
    SELECT
      sessions.token,
      sessions.expires_at,
      users.id as user_id,
      users.name,
      users.email,
      users.role
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token = ?
    LIMIT 1
  `).get(token) as
    | {
        token: string;
        expires_at: string;
        user_id: number;
        name: string;
        email: string | null;
        role: string;
      }
    | undefined;

  if (!session) return null;

  if (new Date(session.expires_at) < new Date()) {
    db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
    return null;
  }

  return session;
}

export function deleteSession(token: string | undefined) {
  if (!token) return;
  db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
}