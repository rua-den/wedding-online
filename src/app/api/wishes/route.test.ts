import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeDatabaseForTests, getDatabase } from "@/lib/sqlite";
import { createAdminInvitation } from "@/lib/sqlite-store";
import { POST } from "./route";

let directory: string;
let ipCounter = 0;

function request(body: unknown, ip = `192.0.2.${++ipCounter}`) {
  return new Request("http://localhost/api/wishes", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": ip },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "wishes-route-"));
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("SQLITE_PATH", join(directory, "wedding.sqlite"));
  ipCounter = 0;
  createAdminInvitation({ code: "demo", name: "Khách demo", maxGuests: 2 });
});

afterEach(() => {
  closeDatabaseForTests();
  vi.unstubAllEnvs();
  rmSync(directory, { recursive: true, force: true });
});

describe("POST /api/wishes", () => {
  it("persists a valid guest name and wish", async () => {
    const response = await POST(request({ invitationCode: "demo", name: "  Minh  ", message: "  Hẹn gặp hai bạn!  " }));
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await response.json()).message).toBe("Đã gửi lời chúc.");
    expect(getDatabase().prepare("SELECT invitation_code, name, message FROM gift_wishes").all()).toEqual([
      { invitation_code: "demo", name: "Minh", message: "Hẹn gặp hai bạn!" },
    ]);
  });

  it("rejects an invalid payload", async () => {
    const response = await POST(request({ name: "", message: "" }));
    expect(response.status).toBe(400);
    expect(getDatabase().prepare("SELECT COUNT(*) AS count FROM gift_wishes").get()).toEqual({ count: 0 });
  });

  it("rate limits repeated submissions from one client", async () => {
    const body = { name: "Minh", message: "Lời chúc" };
    for (let index = 0; index < 5; index += 1) expect((await POST(request(body, "198.51.100.7"))).status).toBe(201);
    const response = await POST(request(body, "198.51.100.7"));
    expect(response.status).toBe(429);
  });
});
