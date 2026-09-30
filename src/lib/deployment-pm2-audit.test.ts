import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];
const workflowPath = resolve(".github/workflows/ci.yml");

function pm2PidLookup() {
  const workflow = readFileSync(workflowPath, "utf8");
  const remote = workflow.split("<<'REMOTE_AUDIT'")[1]?.split("REMOTE_AUDIT")[0] ?? "";
  const start = remote.indexOf("# Inspect existing PM2 and /proc metadata directly.");
  const end = remote.indexOf("LISTENERS=", start);
  if (start < 0 || end < 0) throw new Error("PM2 read-only lookup block is missing");
  return remote.slice(start, end).split("\n").map((line) => line.replace(/^          /, "")).join("\n");
}

function bashPath(value: string) {
  if (process.platform !== "win32") return value;
  return execFileSync("C:\\Program Files\\Git\\usr\\bin\\cygpath.exe", ["-u", value], { encoding: "utf8" }).trim();
}

function bashQuote(value: string) {
  return `'${bashPath(value).replace(/'/g, `'\\''`)}'`;
}

function runLookup(pm2Home: string, procRoot: string, current: string) {
  const bash = process.platform === "win32" ? "C:\\Program Files\\Git\\bin\\bash.exe" : "bash";
  const script = [
    "set -euo pipefail",
    `PM2_HOME=${bashQuote(pm2Home)}`,
    `CURRENT=${bashQuote(current)}`,
    pm2PidLookup().replace('PROC_ROOT="/proc"', `PROC_ROOT=${bashQuote(procRoot)}`),
    'printf "%s\\n" "$APP_PID"',
  ].join("\n");
  return execFileSync(bash, ["-c", script], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function filesUnder(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(root, entry.name);
    return entry.isDirectory() ? filesUnder(absolute).map((child) => `${entry.name}/${child}`) : [entry.name];
  }).sort();
}

type FixtureOptions = {
  daemon?: boolean;
  missingDaemonProcess?: boolean;
  appPid?: number;
  appParentPid?: number;
  appState?: string;
  extraAppPidFile?: boolean;
  missingAppProcess?: boolean;
  daemonIdentity?: string;
  wrongCwd?: boolean;
  absentPm2Home?: boolean;
  instanceId?: number;
};

function fixture(options: FixtureOptions = {}) {
  const root = mkdtempSync(join(tmpdir(), "wedding-pm2-audit-"));
  roots.push(root);
  const home = join(root, "home");
  mkdirSync(home);
  const pm2Home = join(home, ".pm2");
  const pidDirectory = join(pm2Home, "pids");
  const procRoot = join(root, "proc");
  const current = join(root, "releases", "a".repeat(40));
  const otherRelease = join(root, "releases", "b".repeat(40));
  const daemonPid = 4100;
  const appPid = options.appPid ?? 4101;
  const instanceId = options.instanceId ?? 0;
  if (!options.absentPm2Home) mkdirSync(pidDirectory, { recursive: true });
  if (!options.missingDaemonProcess) mkdirSync(join(procRoot, String(daemonPid)), { recursive: true });
  if (!options.missingAppProcess) mkdirSync(join(procRoot, String(appPid)), { recursive: true });
  mkdirSync(current, { recursive: true });
  mkdirSync(otherRelease, { recursive: true });
  if (options.daemon !== false && !options.absentPm2Home) {
    writeFileSync(join(pm2Home, "pm2.pid"), `${daemonPid}\n`);
    if (!options.missingDaemonProcess) {
      writeFileSync(join(procRoot, String(daemonPid), "cmdline"), options.daemonIdentity ?? "PM2 v6.0.8: God Daemon (/tmp/pm2-home)\0");
    }
  }
  if (!options.absentPm2Home) {
    writeFileSync(join(pidDirectory, `huy-nhi-wedding-${instanceId}.pid`), `${appPid}\n`);
    if (options.extraAppPidFile) writeFileSync(join(pidDirectory, "huy-nhi-wedding-1.pid"), "4102\n");
  }
  if (!options.missingAppProcess) {
    writeFileSync(join(procRoot, String(appPid), "status"), `Name:\tnode\nState:\t${options.appState ?? "S"} (sleeping)\nPPid:\t${options.appParentPid ?? daemonPid}\n`);
    symlinkSync(options.wrongCwd ? otherRelease : current, join(procRoot, String(appPid), "cwd"), process.platform === "win32" ? "junction" : "dir");
  }
  return { root, pm2Home, procRoot, current, appPid };
}

afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe("read-only PM2 audit PID lookup", () => {
  it("resolves one live app PID whose cwd and parent identify the current PM2 release", () => {
    const test = fixture();

    expect(runLookup(test.pm2Home, test.procRoot, test.current)).toBe(String(test.appPid));
  });

  it("accepts the PM2 daemon.js process identity when its process title is unavailable", () => {
    const test = fixture({ daemonIdentity: "/usr/bin/node\0/usr/lib/node_modules/pm2/lib/Daemon.js\0" });

    expect(runLookup(test.pm2Home, test.procRoot, test.current)).toBe(String(test.appPid));
  });

  it("accepts one app PID file with a nonzero PM2 instance id", () => {
    const test = fixture({ instanceId: 7 });

    expect(runLookup(test.pm2Home, test.procRoot, test.current)).toBe(String(test.appPid));
  });

  const invalidCases: Array<[string, FixtureOptions]> = [
    ["missing daemon metadata", { daemon: false }],
    ["stale daemon PID metadata", { missingDaemonProcess: true }],
    ["absent PM2 home", { absentPm2Home: true }],
    ["stale app PID metadata", { missingAppProcess: true }],
    ["wrong daemon identity", { daemonIdentity: "/usr/bin/node\0/opt/app/server.js\0" }],
    ["app process with the wrong parent", { appParentPid: 4998 }],
    ["zombie app process", { appState: "Z" }],
    ["app process with the wrong cwd", { wrongCwd: true }],
    ["ambiguous app PID metadata", { extraAppPidFile: true }],
  ];

  it.each(invalidCases)("fails without creating files for %s", (_label, options) => {
    const test = fixture(options);
    const before = filesUnder(test.root);

    expect(() => runLookup(test.pm2Home, test.procRoot, test.current)).toThrow();
    expect(filesUnder(test.root)).toEqual(before);
    expect(existsSync(join(test.pm2Home, "pm2.pid"))).toBe(options.daemon !== false && !options.absentPm2Home);
  });
});
