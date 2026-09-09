import { createCipheriv, randomBytes } from "node:crypto";

/** 仅用于失败原生诊断 payload；缺少密钥时调用方不得持久化完整 payload。 */
export function encryptEnginePayload(value: unknown, encodedKey: string): string {
  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32) throw new Error("AGENT_ENGINE_PAYLOAD_ENCRYPTION_KEY 必须是 32-byte Base64 密钥");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${ciphertext.toString("base64")}`;
}
