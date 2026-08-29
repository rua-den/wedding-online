import { noStoreJson, rejectUnlessAdmin } from "@/lib/admin-route";
import {
  getSiteSettings,
  SiteSettingsValidationError,
  siteSettingsSchema,
  siteSettingsUpdateSchema,
  updateSiteSettings,
} from "@/lib/site-settings";

export const dynamic = "force-dynamic";

function validationMessage(body: unknown, issues: Array<{ message: string }>): string {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "Thông tin địa điểm chưa hợp lệ.";
  return issues[0]?.message ?? "Thông tin địa điểm chưa hợp lệ.";
}

export async function GET(request: Request) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;
  try {
    return noStoreJson({ settings: getSiteSettings() });
  } catch {
    return noStoreJson({ message: "Không thể tải thông tin địa điểm." }, { status: 500 });
  }
}

async function save(request: Request) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;
  const body = await request.json().catch(() => null);
  const parsed = siteSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return noStoreJson({ message: validationMessage(body, parsed.error.issues) }, { status: 400 });
  }
  try {
    return noStoreJson({ settings: updateSiteSettings(parsed.data) });
  } catch (error) {
    if (error instanceof SiteSettingsValidationError) return noStoreJson({ message: error.message }, { status: 400 });
    return noStoreJson({ message: "Không thể lưu thông tin địa điểm." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return save(request);
}

export async function PATCH(request: Request) {
  const rejected = rejectUnlessAdmin(request);
  if (rejected) return rejected;
  const body = await request.json().catch(() => null);
  const parsed = siteSettingsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return noStoreJson({ message: validationMessage(body, parsed.error.issues) }, { status: 400 });
  }
  try {
    return noStoreJson({ settings: updateSiteSettings(parsed.data) });
  } catch (error) {
    if (error instanceof SiteSettingsValidationError) return noStoreJson({ message: error.message }, { status: 400 });
    return noStoreJson({ message: "Không thể lưu thông tin địa điểm." }, { status: 500 });
  }
}
