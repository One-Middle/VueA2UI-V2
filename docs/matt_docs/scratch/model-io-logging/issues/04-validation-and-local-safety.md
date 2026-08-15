# 04 - Validation and local safety

**构建内容：** 补齐第一版 Model IO logging 的验证、忽略规则和本地安全边界，确保日志可用但不会误提交或破坏测试。

**阻塞关系：** Depends on `01-model-io-logger-foundation`, `02-model-client-jsonl-integration`, and `03-agent-runtime-trace-context`.

**Status:** resolved

## Scope

- 将 `logs/` 加入 `.gitignore`。
- 为 Model IO logger 增加聚焦测试：
  - mode 解析。
  - 截断策略。
  - role 统计。
  - 脱敏规则。
  - JSONL record 序列化。
- 运行 Agent package typecheck。
- 运行 Agent package tests。
- 增加或运行一个本地 harness，验证：
  - `runtime.run()` 会输出 Model IO 日志。
  - `runtime.runWorkflowTask()` 也会输出 Model IO 日志。
  - `MODEL_IO_LOG=debug` 不写 JSONL。
  - `MODEL_IO_LOG=full` 写 JSONL。

## Acceptance Criteria

- [x] `logs/` 不会被 Git 跟踪。
- [x] Agent package typecheck 通过。
- [x] Agent package tests 通过。
- [x] Model IO logger 单元测试覆盖核心纯函数。
- [x] 本地 harness 证明普通路径和 Workflow 路径都能输出模型输入输出摘要。
- [x] `MODEL_IO_LOG=full` 生成的 JSONL 可被逐行解析。

## Out Of Scope

- 不要求真实模型 API 成功返回；可以用 mock 或失败路径验证日志。
- 不做性能压测。
- 不做生产部署或审计策略。
