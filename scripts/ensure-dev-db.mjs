import { spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backendDir = path.join(rootDir, "packages", "backend");
const prismaClientDir = path.join(
  rootDir,
  "node_modules",
  ".pnpm",
  "@prisma+client@6.19.3_prisma@6.19.3_typescript@5.9.3__typescript@5.9.3",
  "node_modules",
  ".prisma",
  "client"
);
const queryEnginePath = path.join(prismaClientDir, "query_engine-windows.dll.node");
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  fail("缺少 DATABASE_URL，请先在根目录 .env 中配置 PostgreSQL 连接串。");
}

const dbUrl = new URL(databaseUrl);
const host = dbUrl.hostname || "localhost";
const port = Number(dbUrl.port || "5432");

if (!(await canConnect(host, port))) {
  console.log(`[dev-db] PostgreSQL ${host}:${port} 不可连接，尝试启动本地 Docker 数据库...`);
  ensureDockerComposeAvailable();
  startDockerPostgres();

  const connected = await waitForConnection(host, port, 60_000);
  if (!connected) {
    fail(`已尝试启动 Docker PostgreSQL，但仍无法连接 ${host}:${port}。请检查 Docker Desktop 和端口占用。`);
  }
}

console.log("[dev-db] PostgreSQL 已就绪，开始检查 Prisma Client 和数据库结构...");
ensurePrismaClient();
runPrisma(["db", "push", "--skip-generate"]);
console.log("[dev-db] 数据库准备完成。");

function ensurePrismaClient() {
  if (fs.existsSync(queryEnginePath)) {
    console.log("[dev-db] 已检测到 Prisma Client，跳过 generate。");
    return;
  }

  console.log("[dev-db] 未检测到 Prisma Client，执行 prisma generate...");
  runPrisma(["generate"]);
}

function ensureDockerComposeAvailable() {
  const result = spawnSync("docker", ["compose", "version"], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    fail(
      [
        "当前无法连接 PostgreSQL，且未检测到可用的 Docker Compose。",
        "请二选一处理：",
        "1. 启动 Docker Desktop 后重新执行 pnpm dev。",
        "2. 手动启动 PostgreSQL，并确保 .env 中 DATABASE_URL 可连接。",
      ].join("\n")
    );
  }
}

function startDockerPostgres() {
  const result = spawnSync("docker", ["compose", "up", "-d", "postgres"], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    fail(
      [
        "无法自动启动本地 PostgreSQL 容器。",
        detail,
        "请启动 Docker Desktop 后重新执行 pnpm dev；如果你不用 Docker，请手动启动 PostgreSQL 并确认 .env 中 DATABASE_URL 可连接。",
      ]
        .filter(Boolean)
        .join("\n")
    );
  }
}

function runPrisma(args) {
  run(process.execPath, [path.join("node_modules", "prisma", "build", "index.js"), ...args], backendDir);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    env: process.env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    fail(`命令执行失败：${command} ${args.join(" ")}`);
  }
}

function canConnect(targetHost, targetPort) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: targetHost, port: targetPort });
    socket.setTimeout(1500);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForConnection(targetHost, targetPort, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await canConnect(targetHost, targetPort)) return true;
    await delay(1000);
  }
  return false;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fail(message) {
  console.error(`[dev-db] ${message}`);
  process.exit(1);
}
