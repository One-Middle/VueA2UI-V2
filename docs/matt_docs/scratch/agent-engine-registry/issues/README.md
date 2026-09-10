# Agent 引擎注册与选择 Issues

本目录包含基于已确认架构决策拆分的实现任务。

## 顺序

1. [静态插件注册表](./01-01-registry.md)
2. [不透明配置与密钥引用](./02-02-opaque-config.md)
3. [EngineBinding 与续跑状态绑定](./03-03-binding-state.md)
4. [后端依赖组装与默认策略](./04-04-composition.md)

## 完成定义

- 每个 issue 的验收标准均有代码、测试或集成验证证据。
- 平台 Core 与 Engine Adapter 保持双向隔离。
- workflow-v1 adapter 通过公共契约测试。

