# A2UI v0.9 契约

## 1. 定位

本文档是项目内 A2UI v0.9 协议、消息顺序和 Basic Catalog 使用约束的唯一权威入口。

历史参考资料已归档：

- `docs/90-notes/archive/renderer/a2ui-protocol-notes.md`
- `docs/90-notes/archive/renderer/a2ui-renderer-v0_9-guide.md`
- `docs/90-notes/archive/renderer/basic-catalog-component-optimization.md`

## 2. 服务端到客户端消息

当前正式支持：

- `createSurface`
- `updateComponents`
- `updateDataModel`
- `deleteSurface`

`createSurface` 只声明 surface 与 Catalog 的绑定关系，payload 只能包含：

- `surfaceId`
- `catalogId`

生成 UI 时，推荐消息顺序：

1. `createSurface`
2. `updateDataModel`
3. `updateComponents`

持续修改时，可以使用增量 `updateComponents` 和 `updateDataModel`。

## 3. 客户端到服务端消息

Renderer 可通过前端回传：

- `action`：用户交互事件。
- `error`：渲染、绑定或组件解析错误。

### 3.1 Button action 契约决策

`Button.action` 的当前正式契约按 A2UI 官网式结构整理，不采用项目早期实现中的扁平结构：

```json
{
  "action": {
    "event": {
      "name": "submit",
      "context": {
        "data": { "path": "/form" }
      }
    }
  }
}
```

客户端到服务端的 `action` 消息结构为：

```json
{
  "version": "v0.9",
  "action": {
    "name": "submit",
    "kind": "event",
    "surfaceId": "main",
    "sourceComponentId": "submitButton",
    "timestamp": "2026-07-12T00:00:00.000Z",
    "context": {}
  }
}
```

`action.functionCall` 作为未来能力保留在协议讨论和 shared 类型中，但不属于当前可生成、可校验、可执行的正式输入。当前 Agent schema 不放行该字段，Renderer 也不执行该字段：

```json
{
  "action": {
    "functionCall": {
      "call": "openUrl",
      "args": {
        "url": "https://a2ui.org"
      }
    }
  }
}
```

`action.script` 用于用户交互触发的受限本地脚本。脚本由 Renderer JSRuntime 在 SES `Compartment` 中同步执行，可读取和写入当前 surface 的 `dataModel`，并通过宿主显式注入的 `actions` 能力分组派发事件：

```json
{
  "action": {
    "script": {
      "code": "const count = Number(dataModel.get('/count') ?? 0); dataModel.set('/count', count + 1); actions.emit('changed', { count: count + 1 });",
      "deps": ["/count"],
      "context": {}
    }
  }
}
```

当前实现状态：

- `action.event` 是当前正式格式，Agent 应按该格式生成，Renderer 按该格式解析并派发。
- Renderer 回传的 action payload 使用 `kind: "event"`，供后端 action handler 稳定分发。
- `action.script` 是受限本地脚本 action，Renderer 可执行；脚本不直接调用后端，若需形成正式回传事件，应通过 `actions.emit` 复用标准 `a2ui:action` 派发链路。
- `action.functionCall` 只作为未来契约保留，当前 Agent schema 不放行，Renderer 暂不执行。
- 项目早期代码中存在 `{ "name": "...", "context": {} }` 扁平格式；当前 Renderer 不再兼容该格式，Agent 不应生成。

Frontend 负责监听并转发 Renderer action/error，Backend 负责记录，Agent 不直接接收 Renderer 回传。

### 3.2 属性脚本契约

组件属性可使用只读属性脚本从 `dataModel` 计算值。属性脚本必须声明 `deps`，Renderer 通过这些路径建立最小订阅，并在数据变化后重新执行脚本：

```json
{
  "text": {
    "script": {
      "code": "return `当前分数：${dataModel.get('/score') ?? 0}`;",
      "deps": ["/score"],
      "fallback": "当前分数：0"
    }
  }
}
```

属性脚本约束：

- `code` 必须是同步 JS 函数体，并显式 `return` 一个 JSON-compatible 值。
- `deps` 必填，最多 32 个 JSON Pointer 路径。
- `fallback` 可选，用于脚本异常或返回值非法时兜底。
- 属性脚本只注入 `dataModel.get(path)`，不注入 `dataModel.set`、`actions`、DOM、网络、浏览器存储或计时器能力。
- Renderer 第一版使用主线程 SES，不能阻止死循环；脚本应保持为可信简单逻辑。

样式脚本第一版只允许出现在受控样式白名单字段上，例如 `style.color.script`：

```json
{
  "style": {
    "color": {
      "script": {
        "code": "return Number(dataModel.get('/score') ?? 0) >= 60 ? '#16a34a' : '#dc2626';",
        "deps": ["/score"],
        "fallback": "#dc2626"
      }
    }
  }
}
```

`style.script` 返回整个样式对象、任意 CSS、`className`、`innerHTML` 和事件处理器仍不属于正式能力。

## 4. 组件树规则

- 组件树使用邻接表结构。
- 根组件必须包含 `id: "root"`。
- 容器组件通过 `child` 或 `children` 引用其他组件 ID。
- 不允许在 props 中内联嵌套组件对象。
- 不允许使用 Basic Catalog 之外的组件类型。

## 5. Basic Catalog

当前 Renderer 已实现的基础组件包括：

- `Text`
- `Image`
- `Icon`
- `Video`
- `AudioPlayer`
- `Row`
- `Column`
- `List`
- `Card`
- `Tabs`
- `Modal`
- `Button`
- `TextField`
- `CheckBox`
- `ChoicePicker`
- `Slider`
- `DateTimeInput`
- `Divider`

注意：

- 本节说明 Basic Catalog 的协议层组件集合和字段校验来源。
- 字段通过校验只表示该字段是合法 A2UI 输入，不等于当前 Renderer 已完整消费该字段。
- Renderer 对各字段的实际渲染支持程度见 [Renderer Basic Catalog 能力矩阵](../40-implementation/modules/renderer/basic-catalog-capabilities.md)。

组件字段和校验约束由以下文件共同维护：

- `packages/shared/src/a2ui.ts`
- `packages/agent/src/schemas/a2ui-v0.9-schema.json`
- `packages/agent/src/schemas/basic-catalog-schema.json`
- `packages/agent/src/tools/catalog-schema.ts`
- `packages/renderer/src/catalog-registry.ts`

## 6. Agent 输出约束

Agent 只能输出：

```json
{
  "assistantMessage": "说明文本",
  "a2uiMessages": []
}
```

Agent 的身份 Prompt 只注入工作流、输出通道和安全边界；A2UI 生成规则通过 `builtin:a2ui-v0.9-generation` 基础 Skill 渐进披露。该 Skill 由后端 Skill Resolver 放入 `AgentRunInput.enabledSkills` 后供 Runtime 消费，最终提交仍必须通过 `validateA2UI`。

`builtin:a2ui-v0.9-generation` 的 Reference 是 A2UI 生成约束的一部分：

- `a2ui-generation-standards`：生成 UI 前必须请求，定义符合 Renderer 的消息结构、组件树、dataModel、交互脚本、安全边界、bad case 和输出检查。
- `high-quality-a2ui-good-cases`：复杂 UI 或需要质量标杆时请求，提供 Music Player、Finance Brief 和 Work Board 三个完整 good case。

禁止：

- 生成 HTML、JavaScript 或 CSS。
- 读取任意本地路径。
- 使用 Catalog 外组件。
- 绕过 `validateA2UI`。
- 把未校验草稿写入后端正式事件。

## 7. 维护规则

- 新增组件时，必须同步 shared 类型、Agent schema、Catalog schema、Renderer 注册和本文档。
- 修改消息结构时，必须同步 API/SSE 契约和 Agent 校验逻辑。
- Renderer 可为历史数据做兼容，但正式新事件必须通过当前契约校验。

