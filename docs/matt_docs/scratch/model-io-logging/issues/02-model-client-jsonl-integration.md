# 02 - ModelClient JSONL integration

**构建内容：** 将 Model IO logger 接入 `ModelClient.generate()`，让所有模型调用路径都能被统一记录，并在 `full` 模式写入 JSONL trace。

**阻塞关系：** Depends on `01-model-io-logger-foundation`.

**Status:** resolved

## Scope

- 扩展 `ModelClient.generate(messages, traceContext?)` 签名。
- 在模型调用开始时创建 Model IO trace scope，记录 request metadata。
- 在模型调用成功时记录 response content、usage、duration。
- 在模型调用失败时记录 error message、可选 stack、duration。
- `MODEL_IO_LOG=full` 时写入 `logs/model-io/YYYY-MM-DD.jsonl`。
- JSONL 一次模型调用写一行，包含 request、response 或 error。
- 写入前对完整 messages、response 和 error stack 做基础脱敏。
- JSONL 文件目录不存在时自动创建。
- JSONL 写入失败时输出 warn，但不得影响模型调用返回或抛错语义。

## Acceptance Criteria

- [x] 所有 `ModelClient.generate()` 调用都经过统一 Model IO logger。
- [x] 成功调用会记录 `requestId`、model、traceContext、request 摘要、response、usage 和 duration。
- [x] 失败调用会记录 `requestId`、model、traceContext、request 摘要、error 和 duration。
- [x] `MODEL_IO_LOG=full` 会追加写入 `logs/model-io/YYYY-MM-DD.jsonl`。
- [x] JSONL 每一行都是合法 JSON。
- [x] JSONL 中的敏感 token 被脱敏。
- [x] JSONL 写入失败不会改变模型调用结果。

## Out Of Scope

- 不改变模型 HTTP 请求体。
- 不改变 `ModelResponse` 结构。
- 不新增 API、SSE 或数据库表。
