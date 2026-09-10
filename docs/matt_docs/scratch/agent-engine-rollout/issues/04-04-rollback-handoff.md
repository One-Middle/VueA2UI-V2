# 04 - 回退与运维交接

**构建内容：** 定义新 workflow 切回 ReAct、在途运行处理、状态清理、配置与验证记录。

**状态：** planned

## 范围

- 定义新 workflow 切回 ReAct、在途运行处理、状态清理、配置与验证记录。
- 遵守平台 Core 与 Engine Adapter 的双向隔离。
- 为公开行为补充与风险相称的测试。

## 验收标准

- [ ] 回退不修改已绑定 workflow。
- [ ] continuation 不跨引擎迁移。
- [ ] 文档记录 adapter 版本与回退证据。。

## 非目标

- 不把其他 scratch 的职责提前耦合进本 issue。
- 不引入具体引擎或平台业务类型到 SPI。

