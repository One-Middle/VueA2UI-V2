---
name: "A2UI v0.9 组件消息生成"
description: "用于生成、修改或修复合法 A2UI v0.9 server-to-client 组件消息；当用户要求创建或修改 UI 时必须使用。"
version: 1
---

# A2UI v0.9 组件消息生成

当用户要求创建、修改或修复 UI/A2UI 组件消息时，必须遵循本 Skill。除非用户只是纯文字聊天，否则生成前应先掌握本 Skill 的完整规则。

## 1. 最终输出结构

当你已经掌握所需组件字段时，必须只输出严格 JSON 对象，不要使用 Markdown 代码块，不要输出 JSON 之外的解释文字。

{
  "assistantMessage": "先简要复述你对用户需求的理解，再说明生成或修改了什么",
  "a2uiMessages": []
}

如果用户只是聊天、解释或询问，并没有要求创建或修改 UI，则 a2uiMessages 必须是空数组 []。

## 2. 组件详情请求结构

如果你还不知道某些组件的可用字段、必填项或枚举值，先输出组件详情请求，不要猜字段。

{
  "assistantMessage": "需要查看组件详情后再生成。",
  "componentInfoRequest": {
    "components": ["Column", "Text", "Card"],
    "reason": "需要布局、文本和卡片容器字段"
  }
}

componentInfoRequest.components 只能填写 Basic Catalog 中存在的组件名称。

## 3. Skill 内容请求结构

如果你需要遵循某个已启用 Skill 的完整规则，先输出 Skill 内容请求，不要凭摘要猜测完整规则。

{
  "assistantMessage": "需要查看相关 Skill 后再生成。",
  "skillInfoRequest": {
    "skills": ["skill-id-or-name"],
    "reason": "需要遵循该 Skill 的生成规范"
  }
}

skillInfoRequest.skills 只能填写已启用 Skill 摘要中的 id 或 name。优先使用 id。

## 4. 消息类型

a2uiMessages 是 A2UI v0.9 server-to-client 消息数组，每条消息只能是下面四种之一：

1. createSurface: { "version": "v0.9", "createSurface": { "surfaceId": "main", "catalogId": "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json" } }
2. updateDataModel: { "version": "v0.9", "updateDataModel": { "surfaceId": "main", "path": "/", "value": { ... } } }
3. updateComponents: { "version": "v0.9", "updateComponents": { "surfaceId": "main", "components": [ ... ] } }
4. deleteSurface: { "version": "v0.9", "deleteSurface": { "surfaceId": "main" } }

生成新 UI 时必须先 createSurface，再 updateDataModel（如需要），最后 updateComponents。surfaceId 固定使用 "main"。

## 5. 组件树规则

每个组件对象必须包含 { "id": "唯一组件ID", "component": "组件类型名称" }。
必须存在一个 id 为 "root" 的组件作为 UI 树根节点。
A2UI 使用邻接表，不使用嵌套 children 对象。容器通过字符串 id 引用子组件。
同一 surface 内所有组件 id 必须唯一，所有 child/children/tabItems.child 引用的 id 必须真实存在。

## 6. 数据绑定

动态数据使用 JSON Pointer：{ "path": "/some/data/path" }。
固定文案直接写字符串，不必放入 dataModel。

## 7. JSRuntime 受限脚本

Renderer 支持受限 JSRuntime，用于少量声明式绑定难以表达的同步逻辑。它不是浏览器 JavaScript 环境，不能访问 DOM、window、document、fetch、网络、定时器、import、async/await、eval 或任意外部 API。

优先级：

1. 能用静态值时用静态值。
2. 能用 { "path": "/..." } 绑定时用数据绑定。
3. 只有需要简单派生值、条件展示、格式化、点击后改写 dataModel 或派发事件时，才使用受限 script。

### 7.1 属性脚本

属性脚本用于组件属性值或 style 白名单字段，格式为：

{
  "script": {
    "code": "const done = dataModel.get('/done'); return done ? '已完成' : '待处理';",
    "deps": ["/done"],
    "fallback": "待处理"
  }
}

规则：

- 属性脚本必须显式 return。
- deps 必须包含 1 到 32 个 JSON Pointer 路径，用于 Renderer 订阅刷新。
- 只能读取 dataModel.get(path)，不能写入 dataModel。
- 返回值必须是 JSON-compatible：string、number、boolean、null、object 或 array。
- 执行失败或返回值非法时使用 fallback；fallback 也必须是 JSON-compatible。
- 适合用于 Text.text、Image.url、Icon.name、表单 value、style.color、style.opacity 等 schema 明确允许脚本的字段。

### 7.2 Button.action.script

按钮可以使用 action.script 在点击时执行受限同步脚本，格式为：

{
  "action": {
    "script": {
      "code": "const count = Number(dataModel.get('/count') ?? 0); dataModel.set('/count', count + 1); actions.emit('counterChanged', { count: count + 1 });",
      "deps": ["/count"],
      "context": { "source": "incrementButton" }
    }
  }
}

规则：

- action.script 只在用户触发动作时执行，不参与响应式订阅。
- 动作脚本可以读取 dataModel.get(path)，也可以用 dataModel.set(path, value) 写入 JSON-compatible 值。
- 如需通知后端或宿主，使用 actions.emit(name, context)；不要直接调用后端 API。
- context 是注入脚本的静态或动态上下文，可在脚本中通过 context 读取。
- deps 可选，最多 32 个 JSON Pointer 路径，用于声明脚本依赖，不能替代实际读取逻辑。

### 7.3 脚本安全边界

- 只写短小、同步、确定性的函数体，code 最长 2000 字符。
- 不要使用 import、async、await、eval、Function、setTimeout、Promise、DOM、window、document、fetch、localStorage 或网络能力。
- 不要生成 `<script>`、`javascript:`、HTML 字符串或事件处理器属性。
- 如果只是提交一个业务事件，优先使用 Button.action.event；只有需要先读写 dataModel 或做简单计算时才用 Button.action.script。

## 8. 页面组织方法

不要把页面生成成一串孤立 Text。优先用 Column 作为 root，用 Row、Card、List、Tabs 等容器组织层级。
页面标题使用独立 Text；分区使用 Card 包裹；信息密集页面用 Row/Column 表达并列和纵向内容。
没有请求到组件详情前，不要臆造该组件字段。

## 9. 良好示例

以下示例用于学习组件组织方式。真正最终输出仍然必须是严格 JSON 对象，不要使用 Markdown 代码块。

### 9.1 信息总览页：标题 + 指标卡片 + 行列布局

适合生成看板、汇总页、状态页。重点是：root 使用 Column；顶部说明和指标区分层；Card 内部如果有多个内容，先放入 Column，再让 Card.child 指向该 Column。

{
  "assistantMessage": "我理解你需要一个项目状态总览页。我生成了包含标题、摘要说明和三张指标卡片的 A2UI 页面。",
  "a2uiMessages": [
    {
      "version": "v0.9",
      "createSurface": {
        "surfaceId": "main",
        "catalogId": "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json"
      }
    },
    {
      "version": "v0.9",
      "updateComponents": {
        "surfaceId": "main",
        "components": [
          {
            "id": "root",
            "component": "Column",
            "children": ["pageTitle", "pageSummary", "metricRow"],
            "gap": "16px",
            "style": { "padding": "24px" }
          },
          {
            "id": "pageTitle",
            "component": "Text",
            "text": "项目状态总览",
            "usageHint": "h1"
          },
          {
            "id": "pageSummary",
            "component": "Text",
            "text": "快速查看当前交付进度、风险数量和待办任务。",
            "usageHint": "body",
            "tone": "neutral"
          },
          {
            "id": "metricRow",
            "component": "Row",
            "children": ["progressCard", "riskCard", "todoCard"],
            "gap": "16px",
            "wrap": true,
            "alignment": "stretch"
          },
          {
            "id": "progressCard",
            "component": "Card",
            "child": "progressCardBody",
            "variant": "outlined"
          },
          {
            "id": "progressCardBody",
            "component": "Column",
            "children": ["progressLabel", "progressValue"],
            "gap": "8px"
          },
          {
            "id": "progressLabel",
            "component": "Text",
            "text": "交付进度",
            "usageHint": "caption"
          },
          {
            "id": "progressValue",
            "component": "Text",
            "text": "72%",
            "variant": "metric",
            "tone": "brand"
          },
          {
            "id": "riskCard",
            "component": "Card",
            "child": "riskCardBody",
            "variant": "outlined"
          },
          {
            "id": "riskCardBody",
            "component": "Column",
            "children": ["riskLabel", "riskValue"],
            "gap": "8px"
          },
          {
            "id": "riskLabel",
            "component": "Text",
            "text": "高风险项",
            "usageHint": "caption"
          },
          {
            "id": "riskValue",
            "component": "Text",
            "text": "3",
            "variant": "metric",
            "tone": "warning"
          },
          {
            "id": "todoCard",
            "component": "Card",
            "child": "todoCardBody",
            "variant": "outlined"
          },
          {
            "id": "todoCardBody",
            "component": "Column",
            "children": ["todoLabel", "todoValue"],
            "gap": "8px"
          },
          {
            "id": "todoLabel",
            "component": "Text",
            "text": "待办任务",
            "usageHint": "caption"
          },
          {
            "id": "todoValue",
            "component": "Text",
            "text": "12",
            "variant": "metric",
            "tone": "brand"
          }
        ]
      }
    }
  ]
}

### 9.2 可提交表单：数据模型 + 输入组件 + Button.action.event

适合生成资料收集、反馈提交、筛选条件等页面。重点是：需要可变数据时先 updateDataModel；表单输入绑定到 dataModel；按钮 action 使用 event 结构，并在 context 中传递需要的路径数据。

{
  "assistantMessage": "我理解你需要一个反馈收集表单。我生成了包含姓名、反馈内容和提交按钮的 A2UI 页面。",
  "a2uiMessages": [
    {
      "version": "v0.9",
      "createSurface": {
        "surfaceId": "main",
        "catalogId": "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json"
      }
    },
    {
      "version": "v0.9",
      "updateDataModel": {
        "surfaceId": "main",
        "path": "/",
        "value": {
          "feedback": {
            "name": "",
            "content": ""
          }
        }
      }
    },
    {
      "version": "v0.9",
      "updateComponents": {
        "surfaceId": "main",
        "components": [
          {
            "id": "root",
            "component": "Column",
            "children": ["formTitle", "formCard"],
            "gap": "16px",
            "style": { "padding": "24px", "maxWidth": "720px" }
          },
          {
            "id": "formTitle",
            "component": "Text",
            "text": "提交反馈",
            "usageHint": "h1"
          },
          {
            "id": "formCard",
            "component": "Card",
            "child": "formBody",
            "variant": "outlined"
          },
          {
            "id": "formBody",
            "component": "Column",
            "children": ["nameField", "contentField", "submitButton"],
            "gap": "12px"
          },
          {
            "id": "nameField",
            "component": "TextField",
            "label": "姓名",
            "text": { "path": "/feedback/name" },
            "usageHint": "shortText",
            "placeholder": "请输入姓名"
          },
          {
            "id": "contentField",
            "component": "TextField",
            "label": "反馈内容",
            "text": { "path": "/feedback/content" },
            "usageHint": "longText",
            "minRows": 4,
            "placeholder": "请描述你的反馈"
          },
          {
            "id": "submitButtonLabel",
            "component": "Text",
            "text": "提交反馈"
          },
          {
            "id": "submitButton",
            "component": "Button",
            "child": "submitButtonLabel",
            "variant": "primary",
            "action": {
              "event": {
                "name": "submitFeedback",
                "context": {
                  "feedback": { "path": "/feedback" }
                }
              }
            }
          }
        ]
      }
    }
  ]
}

### 9.3 动态列表：dataModel 数组 + List 模板 + 相对路径

适合生成任务清单、消息列表、商品列表等重复内容。重点是：List.children 使用 { path, componentId }；模板组件内部可以用相对 path 读取当前 item 字段。

{
  "assistantMessage": "我理解你需要一个任务清单。我生成了基于 dataModel 数组渲染的动态列表页面。",
  "a2uiMessages": [
    {
      "version": "v0.9",
      "createSurface": {
        "surfaceId": "main",
        "catalogId": "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json"
      }
    },
    {
      "version": "v0.9",
      "updateDataModel": {
        "surfaceId": "main",
        "path": "/",
        "value": {
          "tasks": [
            { "title": "梳理需求", "owner": "产品", "status": "进行中" },
            { "title": "完成原型", "owner": "设计", "status": "待评审" },
            { "title": "接入接口", "owner": "前端", "status": "未开始" }
          ]
        }
      }
    },
    {
      "version": "v0.9",
      "updateComponents": {
        "surfaceId": "main",
        "components": [
          {
            "id": "root",
            "component": "Column",
            "children": ["taskTitle", "taskList"],
            "gap": "16px",
            "style": { "padding": "24px" }
          },
          {
            "id": "taskTitle",
            "component": "Text",
            "text": "任务清单",
            "usageHint": "h1"
          },
          {
            "id": "taskList",
            "component": "List",
            "children": [{ "path": "/tasks", "componentId": "taskItemCard" }],
            "gap": "12px",
            "preset": "cardList"
          },
          {
            "id": "taskItemCard",
            "component": "Card",
            "child": "taskItemBody",
            "variant": "outlined"
          },
          {
            "id": "taskItemBody",
            "component": "Column",
            "children": ["taskItemTitle", "taskItemMeta"],
            "gap": "6px"
          },
          {
            "id": "taskItemTitle",
            "component": "Text",
            "text": { "path": "title" },
            "usageHint": "h3"
          },
          {
            "id": "taskItemMeta",
            "component": "Text",
            "text": { "path": "status" },
            "usageHint": "caption",
            "tone": "neutral"
          }
        ]
      }
    }
  ]
}

### 9.4 JSRuntime：派生文本 + 点击脚本

适合生成计数器、轻量本地状态切换、字段联动等页面。重点是：展示派生值用属性脚本，点击后修改 dataModel 用 Button.action.script。

{
  "assistantMessage": "我理解你需要一个本地计数器示例。我生成了可点击递增并显示奇偶状态的 A2UI 页面。",
  "a2uiMessages": [
    {
      "version": "v0.9",
      "createSurface": {
        "surfaceId": "main",
        "catalogId": "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json"
      }
    },
    {
      "version": "v0.9",
      "updateDataModel": {
        "surfaceId": "main",
        "path": "/",
        "value": {
          "count": 0
        }
      }
    },
    {
      "version": "v0.9",
      "updateComponents": {
        "surfaceId": "main",
        "components": [
          {
            "id": "root",
            "component": "Column",
            "children": ["counterTitle", "countText", "statusText", "incrementButton"],
            "gap": "12px",
            "style": { "padding": "24px" }
          },
          {
            "id": "counterTitle",
            "component": "Text",
            "text": "本地计数器",
            "usageHint": "h1"
          },
          {
            "id": "countText",
            "component": "Text",
            "text": {
              "script": {
                "code": "const count = Number(dataModel.get('/count') ?? 0); return `当前计数：${count}`;",
                "deps": ["/count"],
                "fallback": "当前计数：0"
              }
            },
            "variant": "metric",
            "tone": "brand"
          },
          {
            "id": "statusText",
            "component": "Text",
            "text": {
              "script": {
                "code": "const count = Number(dataModel.get('/count') ?? 0); return count % 2 === 0 ? '偶数' : '奇数';",
                "deps": ["/count"],
                "fallback": "偶数"
              }
            },
            "style": {
              "color": {
                "script": {
                  "code": "const count = Number(dataModel.get('/count') ?? 0); return count % 2 === 0 ? '#2563eb' : '#16a34a';",
                  "deps": ["/count"],
                  "fallback": "#2563eb"
                }
              }
            }
          },
          {
            "id": "incrementButtonLabel",
            "component": "Text",
            "text": "加 1"
          },
          {
            "id": "incrementButton",
            "component": "Button",
            "child": "incrementButtonLabel",
            "variant": "primary",
            "action": {
              "script": {
                "code": "const count = Number(dataModel.get('/count') ?? 0); const next = count + 1; dataModel.set('/count', next); actions.emit('countChanged', { count: next });",
                "deps": ["/count"],
                "context": { "source": "counter" }
              }
            }
          }
        ]
      }
    }
  ]
}

## 10. 常见错误与禁止写法

- Row/Column 的 children 只能写组件 id 字符串数组，不要写完整组件对象。
- Card 使用单个 child 字段，不要写 children；如果卡片内有多个内容，先创建一个 Column，再让 Card.child 指向这个 Column。
- Button.action 必须是 { "event": { "name": "...", "context": { ... } } }，不要写成字符串或旧版扁平 { "name": "..." }。
- 不要生成 action.functionCall；它是未来能力，当前 Renderer 不执行。
- 禁止生成 table、div、input、select、Schedule、Calendar 等 Catalog 外组件。
- 禁止使用 className、css、html、innerHTML、onClick、onInput、onChange 等非 Catalog 字段；script 只能出现在属性脚本包装对象或 Button.action.script 中。
- style 只能使用受控白名单字段；复杂视觉效果优先使用 variant、size、tone、preset。
- 禁止把 JSRuntime 当作浏览器脚本环境使用，不要访问 DOM、window、document、fetch、网络或外部 API。
