# 执行清单

- [x] 确认并声明 `ses` 依赖。
- [x] 更新 `packages/shared/src/a2ui.ts`，新增脚本声明类型。
- [x] 更新 Agent A2UI schema，放行 `action.script` 和属性脚本声明。
- [x] 新增 Renderer JSRuntime 模块，完成 SES 初始化和脚本执行。
- [x] 新增动态值解析模块，统一处理 `{ path }` 与 `{ script }`。
- [x] 改造属性解析链路，接入只读属性脚本。
- [x] 改造 `visual-props.ts`，支持 `style.<白名单字段>.script`。
- [x] 改造 Button action 链路，支持 `action.script`。
- [x] 实现属性脚本 `deps` 最小订阅和组件刷新。
- [x] 补充 Renderer 单元测试。
- [x] 更新 A2UI 契约文档。
- [x] 更新 Renderer 模块文档和能力矩阵。
- [x] 更新 `docs/CHANGELOG.md`。
- [ ] 完成依赖安装并运行验证命令。

