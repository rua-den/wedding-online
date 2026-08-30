import { z } from "zod";

import { noStoreJson, rejectUnlessAdmin } from "@/lib/admin-route";
import { removeAudioFile, saveAudioFile } from "@/lib/audio-upload";
import { clearMusicSettings, getMusicSettings, updateMusicSettings } from "@/lib/music-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const settingsSchema = z.object({
  enabled: z.boolean(),
  title: z.string().trim().max(160),
  loop: z.boolean(),
}).strict();

export async function GET(request: Request) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;
  return noStoreJson({ music: getMusicSettings() });
}

export async function POST(request: Request) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return noStoreJson({ message: "Vui lòng chọn một tệp MP3." }, { status: 400 });

  const previous = getMusicSettings();
  let uploaded: Awaited<ReturnType<typeof saveAudioFile>> | null = null;
  try {
    uploaded = await saveAudioFile(file);
    const title = (form?.get("title")?.toString() || file.name.replace(/\.[^.]+$/, "")).trim().slice(0, 160);
    const music = updateMusicSettings({ enabled: true, src: uploaded.src, title, loop: previous.loop });
    if (previous.src && previous.src !== music.src) await removeAudioFile(previous.src).catch(() => undefined);
    return noStoreJson({ music }, { status: 201 });
  } catch (error) {
    if (uploaded?.src) await removeAudioFile(uploaded.src).catch(() => undefined);
    return noStoreJson({ message: error instanceof Error ? error.message : "Không thể tải nhạc lên." }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return noStoreJson({ message: "Cài đặt nhạc chưa hợp lệ." }, { status: 400 });
  const current = getMusicSettings();
  return noStoreJson({ music: updateMusicSettings({ ...parsed.data, src: current.src }) });
}

export async function DELETE(request: Request) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;
  const current = getMusicSettings();
  const music = clearMusicSettings();
  if (current.src) await removeAudioFile(current.src).catch(() => undefined);
  return noStoreJson({ music });
}
