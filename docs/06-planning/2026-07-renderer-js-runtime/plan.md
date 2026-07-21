# Renderer JSRuntime 实施计划

## 1. 总体方案

新增一个基于 SES 的 Renderer JSRuntime。JSRuntime 只负责在受限 `Compartment` 中执行脚本，实际数据能力由 Renderer 注入。

第一版采用主线程 SES：

- 通过 `lockdown()` 初始化 SES。
- 通过 `Compartment` 注入最小能力对象。
- 通过代码长度、同步执行、返回值校验和错误 fallback 降低风险。

后续如果需要防止死循环，再演进为 Worker + SES。MVP 阶段接受可信简单脚本和长度限制。

## 2. 脚本类型

### 2.1 属性脚本

属性脚本用于计算组件属性值，支持文本、布尔属性和受控样式字段。

示例：

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

能力：

```ts
{
  dataModel: {
    get(path: string): JsonValue | undefined;
  }
}
```

限制：

- `deps` 必填。
- 必须显式 `return`。
- 只允许同步返回 `JsonValue`。
- 不注入 `dataModel.set`、`actions`、DOM、网络、浏览器存储等能力。

### 2.2 样式字段脚本

第一版只支持 `style.<白名单字段>.script`。

示例：

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

解析后仍进入 `visual-props.ts` 的样式白名单，不开放 `className`、任意 CSS、`innerHTML` 或事件处理器。

### 2.3 动作脚本

`action.script` 用于用户交互触发的本地脚本。

示例：

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

能力：

```ts
{
  dataModel: {
    get(path: string): JsonValue | undefined;
    set(path: string, value: JsonValue): void;
  };
  actions: {
    emit(name: string, context?: JsonObject): void;
  };
  context: JsonObject;
}
```

说明：

- `actions` 是能力分组，由 Renderer 或宿主调用 JSRuntime 时显式注入。
- `actions.emit` 默认可复用现有 `a2ui:action` 派发链路。
- `action.script` 不参与响应式订阅，只在点击等动作发生时执行。

## 3. 模块设计

新增：

```text
packages/renderer/src/core/js-runtime.ts
packages/renderer/src/core/dynamic-value.ts
```

`js-runtime.ts` 职责：

- 初始化 SES。
- 执行属性脚本。
- 执行动作脚本。
- 校验脚本声明、返回值和注入能力边界。

`dynamic-value.ts` 职责：

- 统一解析静态值、`{ path }` 和 `{ script }`。
- 支持对象子字段递归解析，服务 `style.<白名单字段>.script`。
- 将脚本错误转为 fallback，并向上层提供错误信息。

改造：

- `DataContext.resolve()` 或 `ComponentContext.resolveValue()` 接入动态值解析。
- `ButtonComponent.vue` 支持 `action.script`。
- `visual-props.ts` 支持样式白名单字段中的脚本值。
- `A2uiComponent.vue` 注入动作脚本所需的 `actions.emit` 能力。

## 4. 最小订阅方案

属性脚本依赖 `deps`，Renderer 第一版实现最小订阅：

1. 解析组件属性时发现脚本声明。
2. 读取脚本的 `deps`。
3. 对每个路径调用 `dataModel.subscribe(path, callback)`。
4. 依赖变化时递增当前组件上下文的 `scriptRevision`。
5. `computed` 读取 `scriptRevision`，触发属性脚本重新执行。
6. 组件卸载时取消订阅。

动作脚本不订阅 `deps`。动作触发时直接读取当前 `DataModel`。

## 5. 错误处理

建议新增错误码：

- `SCRIPT_EXECUTION_ERROR`
- `SCRIPT_RETURN_INVALID`
- `SCRIPT_CODE_TOO_LONG`
- `SCRIPT_DEPS_INVALID`
- `SCRIPT_WRITE_INVALID`

属性脚本错误处理：

- 返回 `fallback`。
- 如果没有 `fallback`，返回 `undefined`，由组件原有默认值兜底。
- 派发 Renderer error，不中断整个 surface 渲染。

动作脚本错误处理：

- 捕获异常并派发 Renderer error。
- 已经完成的 `dataModel.set` 不回滚。
- 错误后不继续执行脚本后续逻辑。

## 6. 安全限制

MVP 限制：

- `code` 最大 2000 字符。
- `deps` 必填，最多 32 条。
- 属性脚本必须显式 `return`。
- 脚本同步执行，不支持 `async/await`。
- 不支持 `import`。
- 不注入 DOM、网络、浏览器存储、计时器和全局宿主对象。
- 返回值和写入值必须是 JSON-compatible。

已知风险：

- 主线程 SES 不能阻止死循环或长时间计算。MVP 假设脚本来自可信的简单逻辑。后续如需强超时，应升级为 Worker + SES。

## 7. 验收标准

- `Text.text.script` 能根据 `dataModel` 返回动态文本。
- `style.color.script` 能根据 `dataModel` 动态计算颜色，并继续受样式白名单约束。
- `property.script.deps` 变化后属性脚本重新执行并刷新 UI。
- `Button.action.script` 能读取和写入 `dataModel`。
- `Button.action.script` 能通过 `actions.emit` 派发标准 `a2ui:action`。
- 属性脚本无法调用 `dataModel.set` 或 `actions.emit`。
- 脚本异常时使用 fallback，并派发 Renderer error。
- 文档、shared 类型、Agent schema 和 Renderer 能力矩阵同步更新。
