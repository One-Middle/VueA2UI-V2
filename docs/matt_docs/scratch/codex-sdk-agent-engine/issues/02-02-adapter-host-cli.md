# 02 - 私有 bridge 与 engine-host CLI

**构建内容：** 实现 Codex adapter 自有 engine-host CLI、短期 token 和 loopback host transport；不引入平台类型。

**状态：** planned

## 范围

- 实现 Codex adapter 自有 engine-host CLI、短期 token 和 loopback host transport；不引入平台类型。
- 遵守平台 Core 与 Engine Adapter 的双向隔离。
- 为公开行为补充与风险相称的测试。

## 验收标准

- [ ] CLI 仅暴露通用 context/capability 命令。
- [ ] 工作目录隔离。
- [ ] CLI 路径由 adapter 自己管理。。

## 非目标

- 不把其他 scratch 的职责提前耦合进本 issue。
- 不引入具体引擎或平台业务类型到 SPI。

