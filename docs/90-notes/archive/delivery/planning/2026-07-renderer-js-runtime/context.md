# Renderer JSRuntime 能力建设背景

## 1. 背景

当前 Renderer 的交互能力以 `action.event` 为主，`action.functionCall` 仅作为未来能力保留，不执行业务逻辑。随着 A2UI 场景扩展，部分 UI 需要在 Renderer 本地完成轻量逻辑：

- 点击按钮后读写 `dataModel`，例如计数、自增、切换状态。
- 根据 `dataModel` 计算组件属性，例如文本、按钮禁用状态。
- 根据 `dataModel` 计算受控样式字段，例如分数达标时显示绿色，否则显示红色。

这些逻辑不应退化为任意 DOM、网络或浏览器 API 执行，也不应绕开 A2UI 契约和 Renderer 的状态边界。因此需要建设一个受限 JSRuntime。

## 2. 目标

- 新增 `action.script`，允许用户交互触发受限脚本。
- 新增属性脚本声明，允许组件属性通过只读脚本从 `dataModel` 计算值。
- 支持 `style.<白名单字段>.script`，用于动态样式计算。
- 复用现有 `DataModel.get/set`，不引入第二套状态系统。
- 使用 SES `Compartment` 执行脚本，按能力注入控制脚本可见 API。
- 第一版实现属性脚本的最小响应式订阅：`deps` 变化时重新执行属性脚本。

## 3. 非目标

- 第一版不做 Worker 隔离和超时终止。
- 第一版不支持 `style.script` 返回整个样式对象。
- 第一版不支持异步脚本、`import`、网络请求、DOM 操作或浏览器存储。
- 第一版不把脚本能力扩展为通用插件系统。
- 第一版不恢复历史扁平 action 格式。

## 4. 影响范围

- `packages/shared`：A2UI 类型契约。
- `packages/agent`：A2UI / Basic Catalog schema 放行脚本声明。
- `packages/renderer`：JSRuntime、动态值解析、Button action、样式解析、订阅刷新。
- `docs/30-contracts`：A2UI 契约更新。
- `docs/40-implementation/modules`：Renderer 能力矩阵和模块说明更新。

## 5. 关键约束

- 属性脚本只允许读取 `dataModel`，不允许写入、派发事件或调用宿主能力。
- 动作脚本允许读写 `dataModel`，但额外行为必须通过宿主显式注入的能力分组完成。
- `deps` 必填，用于声明属性脚本依赖的 `dataModel` 路径。
- 属性脚本必须显式 `return`。
- `style` 仍必须走 Renderer 现有白名单，不开放任意 CSS。

