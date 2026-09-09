# 02 - 不透明配置与密钥引用

**构建内容：** 实现 adapter 自有 configSchema 校验、密钥引用解析边界和配置指纹。

**状态：** planned

## 范围

- 实现 adapter 自有 configSchema 校验、密钥引用解析边界和配置指纹。
- 遵守平台 Core 与 Engine Adapter 的双向隔离。
- 为公开行为补充与风险相称的测试。

## 验收标准

- [ ] 平台不读取实际密钥。
- [ ] config 不含 SDK 类型。
- [ ] 审计不泄漏敏感值。。

## 非目标

- 不把其他 scratch 的职责提前耦合进本 issue。
- 不引入具体引擎或平台业务类型到 SPI。

