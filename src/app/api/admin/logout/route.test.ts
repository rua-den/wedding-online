import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/admin/logout", () => {
  it("clears the admin cookie", async () => {
    const response = await POST();
    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toContain("wedding_admin_session=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});

