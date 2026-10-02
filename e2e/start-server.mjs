import nextEnv from "@next/env";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), false, console);
const hash = process.env.E2E_ADMIN_PASSWORD_HASH;
if (!hash) throw new Error("E2E_ADMIN_PASSWORD_HASH is missing.");
process.env.ADMIN_PASSWORD_HASH = hash;
delete process.env.E2E_ADMIN_PASSWORD_HASH;

const nextBin = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
if (!existsSync(nextBin)) throw new Error("Next.js CLI is missing.");
const child = spawn(process.execPath, [nextBin, "start", ...process.argv.slice(2)], { cwd: process.cwd(), env: process.env, stdio: "inherit" });
function stop(signal) { if (child.exitCode === null) child.kill(signal); }
process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
