import { z } from "zod";

import { isInvitationThemeId } from "@/config/invitation-themes";
import { noStoreJson, rejectUnlessAdmin } from "@/lib/admin-route";
import { getAppearanceSettings, updateAppearanceSettings } from "@/lib/appearance-store";

export const dynamic = "force-dynamic";

const appearanceSchema = z.object({ themeId: z.string().trim().min(1).max(80) }).strict();

export async function GET(request: Request) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;

  try {
    return noStoreJson({ appearance: getAppearanceSettings() });
  } catch {
    return noStoreJson({ message: "Không thể tải giao diện thiệp." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;

  const body = await request.json().catch(() => null);
  const parsed = appearanceSchema.safeParse(body);
  if (!parsed.success || !isInvitationThemeId(parsed.data.themeId)) {
    return noStoreJson({ message: "Theme thiệp không hợp lệ." }, { status: 400 });
  }

  try {
    return noStoreJson({ appearance: updateAppearanceSettings({ themeId: parsed.data.themeId }) });
  } catch {
    return noStoreJson({ message: "Không thể lưu giao diện thiệp." }, { status: 500 });
  }
}
