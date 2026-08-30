import { canonicalAudioFilename } from "./audio-upload";
import { getDatabase, initializeDatabase } from "./sqlite";

export type MusicSettings = {
  enabled: boolean;
  src: string | null;
  title: string;
  loop: boolean;
};

const defaultMusicSettings: MusicSettings = { enabled: false, src: null, title: "", loop: true };

function database() {
  initializeDatabase();
  return getDatabase();
}

export function getMusicSettings(): MusicSettings {
  const row = database().prepare("SELECT enabled, src, title, loop FROM music_settings WHERE id = 1").get() as {
    enabled?: number;
    src?: string | null;
    title?: string;
    loop?: number;
  } | undefined;
  if (!row) return { ...defaultMusicSettings };
  const src = row.src && canonicalAudioFilename(row.src) ? row.src : null;
  return {
    enabled: Boolean(src) && row.enabled === 1,
    src,
    title: row.title?.trim() ?? "",
    loop: row.loop !== 0,
  };
}

export function updateMusicSettings(input: MusicSettings): MusicSettings {
  const title = input.title.trim().slice(0, 160);
  const src = input.src && canonicalAudioFilename(input.src) ? input.src : null;
  if (input.src && !src) throw new Error("Tệp nhạc không hợp lệ.");
  const enabled = Boolean(src) && input.enabled;
  const now = new Date().toISOString();
  database().prepare(`
    INSERT INTO music_settings (id, enabled, src, title, loop, updated_at)
    VALUES (1, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      enabled = excluded.enabled,
      src = excluded.src,
      title = excluded.title,
      loop = excluded.loop,
      updated_at = excluded.updated_at
  `).run(enabled ? 1 : 0, src, title, input.loop ? 1 : 0, now);
  return { enabled, src, title, loop: input.loop };
}

export function clearMusicSettings(): MusicSettings {
  return updateMusicSettings(defaultMusicSettings);
}
