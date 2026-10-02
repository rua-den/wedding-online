import { initializeDatabase, getDatabase } from "./sqlite";

export type GiftWish = { id: number; invitationCode: string | null; name: string; message: string; createdAt: string };

function ensureDatabase() { initializeDatabase(); return getDatabase(); }

export function createGiftWish(input: { invitationCode?: string | null; name: string; message: string }): GiftWish {
  const name = input.name.trim();
  const message = input.message.trim();
  if (!name || name.length > 120) throw new Error("Tên người gửi lời chúc không hợp lệ.");
  if (!message || message.length > 1000) throw new Error("Lời chúc không hợp lệ.");
  const invitationCode = input.invitationCode?.trim() || null;
  const createdAt = new Date().toISOString();
  const result = ensureDatabase().prepare("INSERT INTO gift_wishes (invitation_code, name, message, created_at) VALUES (?, ?, ?, ?)").run(invitationCode, name, message, createdAt) as { lastInsertRowid: number };
  return { id: Number(result.lastInsertRowid), invitationCode, name, message, createdAt };
}

export function listGiftWishes(): GiftWish[] {
  const rows = ensureDatabase().prepare("SELECT id, invitation_code, name, message, created_at FROM gift_wishes ORDER BY created_at DESC, id DESC").all() as Array<{ id: number; invitation_code: string | null; name: string; message: string; created_at: string }>;
  return rows.map((row) => ({ id: row.id, invitationCode: row.invitation_code, name: row.name, message: row.message, createdAt: row.created_at }));
}
