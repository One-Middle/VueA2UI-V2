import { execFileSync, spawnSync } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const devPorts = [3100, 5173];

for (const port of devPorts) {
  await stopListenersOnPort(port);
}

run(process.execPath, ["--env-file=.env", path.join("scripts", "ensure-dev-db.mjs")]);

async function stopListenersOnPort(port) {
  const pids = findListenerPids(port);
  if (pids.size === 0) return;

  for (const pid of pids) {
    console.log(`[dev] Port ${port} is used by process ${pid}; stopping old dev process...`);
    const result = spawnSync("taskkill", ["/PID", pid, "/T", "/F"], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: "pipe",
    });

    if (result.status !== 0) {
      const reason = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
      throw new Error(
        `[dev] Failed to stop process ${pid} on port ${port}. Stop it manually and retry.${reason ? `\n${reason}` : ""}`,
      );
    }
  }

  await waitForPortRelease(port);
}

function findListenerPids(port) {
  const output = spawnSync("netstat", ["-ano", "-p", "tcp"], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "pipe",
  });

  if (output.status !== 0) {
    const reason = [output.stdout, output.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`[dev] Failed to inspect port listeners.${reason ? `\n${reason}` : ""}`);
  }

  const pids = new Set();
  const portPattern = new RegExp(String.raw`(?:^|\s)(?:\d+\.\d+\.\d+\.\d+|\[?::\]?|\[::\]|0\.0\.0\.0|127\.0\.0\.1):${port}\s`);

  for (const line of output.stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.includes("LISTENING") || !portPattern.test(trimmed)) continue;

    const parts = trimmed.split(/\s+/);
    const pid = parts.at(-1);
    if (pid && /^\d+$/.test(pid) && pid !== "0") {
      pids.add(pid);
    }
  }

  return pids;
}

async function waitForPortRelease(port) {
  const deadline = Date.now() + 5000;

  while (Date.now() < deadline) {
    if (!(await canConnect(port))) return;
    await delay(100);
  }

  throw new Error(`[dev] Port ${port} was not released after stopping old processes.`);
}

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.setTimeout(500, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function run(command, args) {
  execFileSync(command, args, {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit",
  });
}
