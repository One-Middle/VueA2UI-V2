# 01 - Model IO logger foundation

**构建内容：** 建立 Agent 包内部的 Model IO logging 基础能力，包括日志模式解析、requestId、摘要统计、脱敏和 JSONL 记录结构。

**阻塞关系：** None - can start immediately.

**Status:** resolved

## Scope

- 新增 `packages/agent/src/model/model-io-logger.ts`。
- 定义 `ModelIOLogMode`、`ModelTraceContext` 和 Model IO trace record 的内部类型。
- 从 `process.env.MODEL_IO_LOG` 解析 `off|summary|debug|full`，非法值按 `off` 处理。
- 为每次模型调用生成短 `requestId`。
- 统计 message count、role 分布、每个 role 的字符数和总字符数。
- 实现终端摘要输出：
  - request 摘要。
  - role 统计。
  - response 或 error 摘要。
  - token usage 和 duration。
- 实现 debug 截断预览：
  - system / user prompt 各最多 1000 字。
  - response 最多 2000 字。
- 实现基础脱敏函数，覆盖 `Authorization: Bearer ...`、`Bearer ...`、`sk-...`、`apiKey`、`api_key`、`authorization`、`Authorization` 和 `.env` 风格 `KEY` / `TOKEN` / `SECRET`。

## Acceptance Criteria

- [x] `MODEL_IO_LOG=off` 时不输出 Model IO 日志。
- [x] `MODEL_IO_LOG=summary` 时终端只输出摘要，不输出完整 prompt / response。
- [x] `MODEL_IO_LOG=debug` 时终端输出截断预览，不输出完整长 prompt。
- [x] 每条终端日志包含同一个 `requestId`，可用于关联同一次模型调用。
- [x] 脱敏函数覆盖常见 Bearer token、`sk-*` 和 key-like 字段。
- [x] 日志模块失败不能影响模型调用主流程。

## Out Of Scope

- 不接入 `ModelClient.generate()`。
- 不写 JSONL 文件。
- 不修改 backend、frontend、database 或 API。
