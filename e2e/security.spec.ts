import { expect, test } from "playwright/test";

test("public responses include baseline security headers and a restrictive CSP", async ({ request }) => {
  const response = await request.get("/");
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(response.headers()["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=()");
  expect(response.headers()["x-dns-prefetch-control"]).toBe("off");

  const csp = response.headers()["content-security-policy"];
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("frame-ancestors 'self'");
  expect(csp).toContain("frame-src 'self'");
  expect(csp).not.toContain("'unsafe-eval'");
  expect(csp).not.toMatch(/(^|;)\s*[^;]+-src\s+\*/);
});

test("personalized invitations are private, non-indexable, and still same-origin frameable", async ({ request }) => {
  const response = await request.get("/moi/demo?previewTheme=classic&previewFont=classic");
  expect(response.ok()).toBeTruthy();

  const headers = response.headers();
  expect(headers["x-robots-tag"]).toBe("noindex, nofollow, noarchive");
  expect(headers["cache-control"]).toContain("private");
  expect(headers["cache-control"]).toContain("no-store");
  expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'self'");

  const html = await response.text();
  expect(html).toContain('name="robots"');
  expect(html).toContain("noindex");
  expect(html).toContain("nofollow");
  expect(html).toContain("noarchive");
});
