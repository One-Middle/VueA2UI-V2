# Agent 引擎注册与选择

## 目标

通过静态注册管理满足 SPI 的 adapter，允许平台在完全不了解 adapter 内部实现的前提下选择和恢复引擎。

## 范围

- 实现 `AgentEngineRegistry`、插件注册、配置 Schema 校验和实例生命周期。
- 静态注册已安装 adapter；不支持数据库或远程动态加载代码。
- 持久化通用 EngineBinding：engineId、插件版本、配置引用/不透明配置、continuation 归属。
- 在 workflow 创建时固定实际引擎绑定；用户无感，由后台配置选择。

## 配置与密钥

- 每个 adapter 自己定义和校验 config Schema。
- config 只保存环境变量名或密钥引用，不保存实际密钥。
- 平台只传递不透明 JSON，不读取 Codex API Key、模型、工作目录或 session 目录。

## 规则

- workflow-v1 引擎能力在运行前协商。
- 同一 session/workflow 只允许一个活跃 turn。
- continuation 只能由相同 engineId 和兼容插件版本恢复。
- 运行实际绑定和配置指纹写入审计元数据。

## 验收标准

- 后端工作流服务不直接创建 ReAct 或 Codex 实例。
- 新 adapter 的注册不需要修改业务平台类型。
- ReAct 和 Codex adapter 可通过相同 resolver 创建。
