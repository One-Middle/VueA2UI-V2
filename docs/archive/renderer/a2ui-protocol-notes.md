# A2UI 协议认识

> 基于 A2UI 项目源码 (`D:\Code\a2ui`) 的 docs 文件夹内容编写，重点关注 v0.9 版本。

---

## 一、A2UI 协议是什么

**A2UI（Agent to UI）** 是一个**声明式 UI 协议**，专为 AI 智能体（Agent）驱动的用户界面而设计。它允许 AI 智能体通过发送 JSON 消息来生成丰富的、交互式的用户界面，这些界面由客户端用原生组件进行渲染，适用于 Web、移动端和桌面端，而无需执行任意代码。

### 1.1 解决的问题

| 传统方式 | A2UI 方式 |
|---------|----------|
| 纯文本多轮对话，效率低 | Agent 生成表单、日期选择器、按钮等交互式 UI |
| 发送 HTML/JS（iframe），安全风险高、样式割裂 | 声明式 JSON 数据，由客户端原生成分渲染 |
| Agent 与 UI 紧耦合 | 传输层无关（A2A、AG-UI、SSE、WebSocket 均可） |

### 1.2 核心价值

1. **安全性**：声明式数据而非代码。Agent 从客户端可信的 Catalog（组件目录）请求组件，无代码执行风险。
2. **原生体验**：客户端用自己的 UI 框架（React/Angular/Flutter/Lit 等）渲染，继承应用原生样式、无障碍性、性能。
3. **跨平台可移植**：同一份 JSON 可在 Web（Lit/Angular/React）、移动端（Flutter/SwiftUI/Jetpack Compose）、桌面端渲染。

### 1.3 核心设计原则

1. **LLM 友好**：扁平的组件列表 + ID 引用，支持增量生成、流式输出、轻松纠错。
2. **框架无关**：Agent 发送抽象的组件树，客户端映射到原生组件（Web/移动端/桌面端）。
3. **关注点分离**：三层架构——UI 结构（Components）、应用状态（Data Model）、客户端渲染（Renderer），支持数据绑定和响应式更新。

### 1.4 A2UI 不是什么

- **不是框架**：它是一个协议（定义消息格式和交互规则），而非 UI 框架。
- **不是 HTML 替代品**：专为 Agent 生成 UI 设计，不是用于静态网站。
- **不是样式系统**：客户端控制样式，服务端仅提供有限的样式配置支持。
- **不限于 Web**：同时适用于移动端和桌面端。

### 1.5 核心概念速览

| 概念 | 说明 |
|------|------|
| **Surface（表面）** | 组件的画布（对话框、侧边栏、主视图等），是一个完整的 UI 区域 |
| **Component（组件）** | UI 元素（Button、TextField、Card 等），通过 ID 引用构建层级关系 |
| **Data Model（数据模型）** | 应用状态，组件通过 JSON Pointer 绑定到数据，实现响应式更新 |
| **Catalog（目录）** | 可用的组件类型定义文件（JSON Schema 格式），定义 Agent 可以使用的组件和函数 |
| **Message（消息）** | JSON 对象（createSurface、updateComponents、updateDataModel、deleteSurface） |

### 1.6 架构概览

```
Agent (LLM)  →  A2UI Generator  →  Transport (SSE/WS/A2A)
                                        ↓
Client (Stream Reader)  →  Message Parser  →  Renderer  →  Native UI
```

---

## 二、A2UI v0.9 的信息类型

A2UI v0.9 定义了 **4 种服务端到客户端的消息类型** 和 **2 种客户端到服务端的消息类型**。所有消息均以 JSON Lines（JSONL）格式流式传输，每行一个完整的 JSON 对象。

### 2.1 服务端→客户端消息（Server-to-Client）

#### （1）`createSurface` — 创建表面

初始化一个 UI 表面并指定其组件目录。

```json
{
  "version": "v0.9",
  "createSurface": {
    "surfaceId": "booking",
    "catalogId": "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json",
    "sendDataModel": true
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `surfaceId` | string | ✓ | 唯一标识符 |
| `catalogId` | string | ✓ | 组件目录的 URL |
| `theme` | object | ✗ | 主题配置（如 primaryColor） |
| `sendDataModel` | boolean | ✗ | 若为 true，客户端向服务端回传数据模型变更 |

#### （2）`updateComponents` — 更新组件

添加或更新表面中的 UI 组件。组件采用**邻接表模型**：扁平列表 + ID 引用，而非嵌套树。

```json
{
  "version": "v0.9",
  "updateComponents": {
    "surfaceId": "booking",
    "components": [
      {
        "id": "root",
        "component": "Column",
        "children": ["header", "datetime", "submit-btn"]
      },
      {
        "id": "header",
        "component": "Text",
        "text": "Book Your Table",
        "variant": "h1"
      },
      {
        "id": "datetime",
        "component": "DateTimeInput",
        "value": { "path": "/booking/date" },
        "enableDate": true
      },
      {
        "id": "submit-btn",
        "component": "Button",
        "child": "submit-text",
        "variant": "primary",
        "action": {
          "event": { "name": "confirm_booking" }
        }
      }
    ]
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `surfaceId` | string | ✓ | 目标表面 |
| `components` | array | ✓ | 组件定义列表 |

**组件结构要点**：
- **邻接表模型**：组件通过 `id` 标识，通过 `children`（数组）或 `child` 引用其他组件 ID
- **静态子组件**：`"children": ["id1", "id2"]` — 固定的子组件 ID 列表
- **动态子组件**：`"children": {"path": "/items", "componentId": "item-template"}` — 通过数据模板动态生成
- **字面值**：直接写值，如 `"text": "Hello"`
- **数据绑定**：通过 `{"path": "/user/name"}` 绑定到数据模型（JSON Pointer 路径）

#### （3）`updateDataModel` — 更新数据模型

更新应用状态数据。使用 JSON Pointer（RFC 6901）路径 + 纯 JSON 值。

```json
{
  "version": "v0.9",
  "updateDataModel": {
    "surfaceId": "booking",
    "path": "/booking",
    "value": {
      "date": "2025-12-16T19:00:00Z",
      "guests": 2
    }
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `surfaceId` | string | ✓ | 目标表面 |
| `path` | string | ✗ | JSON Pointer 路径，默认为 `"/"` |
| `value` | any | ✗ | 任意 JSON 值（object/array/string/number/boolean/null），省略则删除 |

**示例路径**：
- `/user/name` — 更新用户名称
- `/cart/items/0/price` — 更新购物车第一项价格
- `/` — 替换整个数据模型

#### （4）`deleteSurface` — 删除表面

移除表面及其所有组件和数据。

```json
{
  "version": "v0.9",
  "deleteSurface": { "surfaceId": "modal" }
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `surfaceId` | string | ✓ | 要删除的表面 ID |

### 2.2 客户端→服务端消息（Client-to-Server）

#### （1）`action` — 用户交互事件

当用户与定义了 `action` 的组件交互（如点击按钮）时，客户端发送此消息。

```json
{
  "version": "v0.9",
  "action": {
    "name": "confirm_booking",
    "surfaceId": "booking",
    "sourceComponentId": "submit-btn",
    "timestamp": "2025-12-16T12:00:00Z",
    "context": {
      "details": {
        "date": "2025-12-16T19:00:00Z",
        "guests": "3"
      }
    }
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 事件名称（Agent 用于路由处理） |
| `surfaceId` | string | 来源表面 |
| `sourceComponentId` | string | 触发组件 ID |
| `timestamp` | string | ISO 8601 时间戳 |
| `context` | object | 组件 action 中定义的上下文数据 |

#### （2）`error` — 错误报告

当客户端检测到验证失败或运行时错误时，可向服务端报告。

```json
{
  "version": "v0.9",
  "error": {
    "code": "VALIDATION_FAILED",
    "surfaceId": "user_profile_card",
    "path": "/components/0/text",
    "message": "Expected stringOrPath, got integer"
  }
}
```

### 2.3 v0.9 vs v0.8 关键变化

| 特性 | v0.8（Legacy） | v0.9（Stable） |
|------|----------------|----------------|
| 表面创建 | `beginRendering` | `createSurface`（分离创建与渲染） |
| 组件格式 | `{"Text": {"text": {...}}}`（嵌套） | `"component": "Text", "text": "..."`（扁平） |
| 子组件 | `{"explicitList": [...]}` / `{"template": {...}}` | `[...]` / `{"path": "/data", "componentId": "..."}` |
| 数据模型 | `contents` 邻接表 + 类型化包裹 | `path` + 纯 JSON `value`（类似 JSON Patch） |
| 版本字段 | 无 | 每条消息必含 `"version": "v0.9"` |
| 设计哲学 | 结构化输出优先 | 提示词优先（prompt-first） |

---

## 三、如何构建一个 A2UI 协议的应用

构建 A2UI 应用需要三个核心部分：**Agent（后端）**、**Renderer（前端渲染器）**、和**Catalog（组件目录）**。

### 3.1 整体步骤

```
1. 定义 Catalog  →  2. 搭建 Agent  →  3. 集成 Renderer  →  4. 连接传输层
```

### 3.2 第一步：定义 Catalog（组件目录）

Catalog 是一个 JSON Schema 文件，定义了 Agent 可以使用的组件、函数和主题。

**选项 A — 使用 Basic Catalog（快速起步）**：
直接使用 A2UI 官方维护的 Basic Catalog，包含通用组件（Button、Text、TextField、Card 等）。

**选项 B — 自定义 Catalog（生产环境推荐）**：
创建自己的 Catalog，反映你的设计系统。

```json
{
  "catalogId": "https://my-company.com/a2ui/my-catalog/v1/catalog.json",
  "components": {
    "MyButton": { "type": "object", "properties": { ... } },
    "MyCard": { "type": "object", "properties": { ... } }
  },
  "functions": [
    { "name": "openUrl", "parameters": { ... } }
  ]
}
```

**推荐策略**：

| 场景 | 建议 |
|------|------|
| 成熟前端项目引入 A2UI | 定义反映现有设计系统的 Catalog |
| 新项目/绿地项目 | 从 Basic Catalog 起步，逐步演进 |

### 3.3 第二步：搭建 Agent（服务端）

Agent 使用 LLM 根据用户意图生成 A2UI JSON 消息。以 Python 为例：

```python
from a2ui.schema.constants import VERSION_0_9
from a2ui.schema.manager import A2uiSchemaManager
from a2ui.basic_catalog.provider import BasicCatalog

# 1. 初始化 Schema 管理器
schema_manager = A2uiSchemaManager(
    version=VERSION_0_9,
    catalogs=[
        BasicCatalog.get_config(version=VERSION_0_9, examples_path="examples/0.9")
    ],
)

# 2. 生成 System Prompt（包含 Schema + 示例）
system_prompt = schema_manager.generate_system_prompt(
    role_description="你是一个餐厅助手，最终输出必须是 A2UI JSON",
    ui_description="预订时使用 BOOKING_FORM 模板...",
    include_schema=True,
    include_examples=True,
    validate_examples=True,
)

# 3. 创建 Agent
root_agent = Agent(
    model='gemini-2.5-flash',
    name="restaurant_agent",
    instruction=system_prompt,
    tools=[get_restaurants],
)
```

**Agent 的工作循环**：
1. **理解用户意图** → 决定展示什么 UI
2. **调用工具/LLM** → 生成 A2UI JSON 消息
3. **验证 Schema** → 检查 JSON 是否符合 Catalog 定义
4. **流式发送** → 通过传输层发送到客户端
5. **处理交互** → 响应客户端的 action 事件

### 3.4 第三步：集成 Renderer（前端渲染器）

A2UI 提供多平台渲染器：

| 渲染器 | 平台 | 安装方式 |
|--------|------|----------|
| **React** | Web | `npm install @a2ui/react @a2ui/web_core` |
| **Lit（Web Components）** | Web | `npm install @a2ui/lit @a2ui/web_core` |
| **Angular** | Web | `npm install @a2ui/angular @a2ui/web_core` |
| **Flutter（GenUI SDK）** | 移动/桌面/Web | `flutter pub add flutter_genui` |

**以 Angular 为例（v0.9）**：

```typescript
import { A2UI_RENDERER_CONFIG, A2uiRendererService, minimalCatalog } from '@a2ui/angular/v0_9';

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: A2UI_RENDERER_CONFIG,
      useValue: {
        catalogs: [minimalCatalog],
        actionHandler: action => {
          console.log('Action received:', action);
          // 发送 action 到 Agent
        },
      },
    },
    A2uiRendererService,
  ],
};
```

**以 React 为例（v0.9）**：

```tsx
import { useA2UI, A2UISurface } from '@a2ui/react';

function App() {
  const { processor } = useA2UI();

  return (
    <A2UISurface surfaceId="main" />
  );
}
```

### 3.5 第四步：连接传输层

A2UI 是**传输层无关**的，支持多种传输方式：

| 传输方式 | 特点 | 适用场景 |
|----------|------|----------|
| **A2A Protocol** | 标准化 Agent 间通信协议 | 多 Agent 系统 |
| **AG-UI** | 双向实时通信 | 实时 UI 更新 |
| **SSE（Server-Sent Events）** | 简单单向流 | 快速原型 |
| **WebSocket** | 持久双向连接 | 实时交互应用 |

### 3.6 数据流完整示例

以"预订餐厅"场景为例，使用 v0.9 协议：

```
用户说："预订明天晚上7点2人位"

↓

Agent 生成并流式发送:

① {"version":"v0.9","createSurface":{"surfaceId":"booking","catalogId":"..."}}

② {"version":"v0.9","updateComponents":{"surfaceId":"booking","components":[
    {"id":"root","component":"Column","children":["header","guests","date","submit-btn"]},
    {"id":"header","component":"Text","text":"确认预订","variant":"h1"},
    {"id":"guests","component":"TextField","label":"人数","value":{"path":"/reservation/guests"}},
    {"id":"date","component":"DateTimeInput","label":"日期","value":{"path":"/reservation/date"}},
    {"id":"submit-btn","component":"Button","child":"submit-text","action":{"event":{"name":"confirm"}}}
  ]}}

③ {"version":"v0.9","updateDataModel":{"surfaceId":"booking","path":"/reservation",
    "value":{"guests":"2","date":"2025-12-16T19:00:00Z"}}}

↓

客户端渲染表单，用户修改人数为"3"并点击确认

↓

客户端发送 action:

{"version":"v0.9","action":{"name":"confirm","surfaceId":"booking","sourceComponentId":"submit-btn","timestamp":"...","context":{"reservation":{"guests":"3","date":"2025-12-16T19:00:00Z"}}}}

↓

Agent 处理预订逻辑，完成后：

{"version":"v0.9","deleteSurface":{"surfaceId":"booking"}}
```

### 3.7 关键特性：数据绑定

- **单向绑定（只读）**：`{"text": {"path": "/user/name"}}` → 数据变化自动更新 UI
- **双向绑定（输入组件）**：`TextField`、`CheckBox` 等组件自动将用户输入写回 Data Model
- **动态列表**：`"children": {"path": "/items", "componentId": "item-template"}` → 通过模板渲染数组

### 3.8 Actions（用户交互）

组件通过 `action` 属性支持两种交互：

1. **Event（事件）**：发送给 Agent 处理（如提交表单）
   ```json
   "action": {"event": {"name": "submit", "context": {"data": {"path": "/form"}}}}
   ```

2. **Function（本地函数）**：在客户端直接执行（如打开 URL）
   ```json
   "action": {"functionCall": {"call": "openUrl", "args": {"url": "https://a2ui.org"}}}
   ```

### 3.9 验证与容错

- **两级验证**：Agent 端（发送前）+ 客户端（接收后），双重保障
- **优雅降级**：未知组件渲染为安全兜底，部分失败不影响整体
- **错误报告**：客户端通过 `error` 消息将验证失败反馈给 Agent，支持自修复

---

## 参考资料

- A2UI 项目仓库：`D:\Code\a2ui`
- 官方文档：https://a2ui.org
- 协议规范 v0.9：`D:\Code\a2ui\specification\v0_9`
- Basic Catalog：`D:\Code\a2ui\specification\v0_9\catalogs\basic\catalog.json`
- 示例代码：`D:\Code\a2ui\samples`
