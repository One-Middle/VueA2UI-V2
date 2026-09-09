#!/usr/bin/env node

/**
 * Codex adapter 私有 CLI：仅转发 SPI Host 的通用 context/capability 命令。
 * 运行时由 adapter 注入 ENGINE_HOST_URL 与 ENGINE_HOST_TOKEN，平台业务不进入本文件。
 */
const [command, payload = "{}"] = process.argv.slice(2);
const baseUrl = process.env.ENGINE_HOST_URL;
const token = process.env.ENGINE_HOST_TOKEN;
if (!baseUrl || !token || !command) throw new Error("缺少 ENGINE_HOST_URL、ENGINE_HOST_TOKEN 或命令");
const endpoint = command === "context.read"
  ? "context/read"
  : command === "capability.invoke"
    ? "capability/invoke"
    : null;
if (!endpoint) throw new Error(`不支持的 engine-host 命令：${command}`);
// CLI 输出始终是 JSON，方便 Codex 将 stdout 当作工具 observation 使用。
const response = await fetch(`${baseUrl}/${endpoint}`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: payload });
if (!response.ok) throw new Error(`engine-host 请求失败：${response.status}`);
process.stdout.write(JSON.stringify(await response.json()));
export {};
