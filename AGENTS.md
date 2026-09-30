<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project coding handoff

Before changing application or deployment code, read `docs/superpowers/plans/2026-09-30-codex-handoff.md` and follow its read order. Treat that file as the current project checkpoint; verify `main` first rather than assuming its recorded SHA is still current.

Key non-negotiables:

- Wedding invitation event dates are **11/10/2026** and **31/10/2026**. Do not create a 10/10 invitation event.
- Do not invent production event time, venue, address, map URL, RSVP deadline, or event copy.
- Preserve invitation scopes `oct11`, `oct31`, `both`, and internal compatibility scope `legacy`; dated rendering must remain fail-closed when required profiles are missing.
- Production SQLite, uploads/music, backups, and `.env` are persistent shared state. Do not weaken the pre/post deploy state verifier or make code releases replace runtime data.
- Automatic production dispatch must remain gated by `CD_ENABLED=true`; a normal merge must not silently deploy while that gate is off.

Forward progress: failures, timeouts, tool errors, and ambiguity are recovery states, not terminal states. Investigate and continue autonomously until the current checkpoint is verified PASS, a real external gate is required, or a genuine external blocker is proven.
