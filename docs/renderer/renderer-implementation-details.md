# Renderer 模块实现详情 v0.1

## 1. 模块概述

`packages/renderer` 是 Vue3 A2UI v0.9 渲染器。它接收已通过后端校验的 A2UI 消息，维护 surface/component/data model 状态，渲染 17 个 Basic Catalog 组件，处理 action/error 派发。

## 2. 文件结构

```text
src/
  core/
    data-model.ts         # JSON Pointer 数据模型
    component-model.ts    # 组件模型
    surface-model.ts      # SurfaceModel + SurfaceGroupModel
    message-processor.ts  # 消息分发器
    data-context.ts       # 数据上下文（动态值解析）
    component-context.ts  # 组件上下文（buildChild, createSetter, dispatchAction）
    catalog.ts            # 组件映射（同步获取）
  vue/
    A2uiSurface.vue       # Surface 渲染入口
    A2uiComponent.vue     # 动态组件渲染器
    context.ts            # ComponentContext 接口和 injection key
  components/
    index.ts              # registerBasicCatalog() 注册函数
    basic/
      TextComponent.vue, ImageComponent.vue, IconComponent.vue,
      VideoComponent.vue, AudioPlayerComponent.vue, DividerComponent.vue,
      RowComponent.vue, ColumnComponent.vue, ListComponent.vue,
      CardComponent.vue, TabsComponent.vue, ModalComponent.vue,
      ButtonComponent.vue, TextFieldComponent.vue, CheckBoxComponent.vue,
      ChoicePickerComponent.vue, SliderComponent.vue, DateTimeInputComponent.vue
  catalog-registry.ts    # 全局组件注册表 Map
  index.ts               # 统一导出
  styles.css             # 渲染器样式
```

## 3. 核心模型

### 3.1 DataModel

JSON Pointer (RFC 6901) 数据模型，内部使用 `reactive` 包裹。

- `get(path)` — 读取值，支持 `/` 表示整个 model
- `set(path, value)` — 设置值，深层路径自动创建中间对象/数组
- `delete(path)` — 删除值
- `subscribe(path, callback)` — 订阅路径变更（祖先路径变更会通知后代订阅者）
- `destroy()` — 清理所有订阅

Path 编码支持 `~0`（~）和 `~1`（/）转义。

### 3.2 SurfaceModel

单个 surface 的状态管理：

- `surfaceId`、`catalogId`、`theme`、`sendDataModel`
- `components: Map<string, ComponentModel>` — 组件映射（reactive）
- `dataModel: DataModel` — 该 surface 的数据模型
- `createSurface(payload)` — 初始化
- `updateComponents(components)` — 增量更新：增/改/删
- `updateDataModel(path, value)` — 更新数据模型
- `destroy()` — 清理所有订阅和组件

### 3.3 SurfaceGroupModel

管理所有 surface 的集合（`Record<string, SurfaceModel>`，reactive）：

- `getOrCreate(surfaceId, catalogId)` — 获取或创建
- `get(surfaceId)` / `delete(surfaceId)` / `destroy()`

### 3.4 ComponentModel

单个 A2UI 组件的模型（reactive）：

- `id`、`componentType`
- `getProperty(key)` — 获取属性值
- `getStaticChildren()` / `getDynamicChild()` — 子组件引用解析
- `getChildIds()` — 合并静态和动态 child 引用
- `update(raw)` — 更新属性，类型变化时返回 false 触发重建

### 3.5 DataContext

包装 DataModel + basePath，提供动态值解析：

- `resolve(expr)` — 如果 expr 是 `{ path: "..." }`，从 dataModel 解析；否则返回原值
- `createChildContext(relativePath)` — 创建带新 basePath 的子 context
- `resolvePath(path)` — 支持 `/` 开头绝对路径和相对路径拼接
- `set(path, value)` / `subscribe(path, callback)`

### 3.6 ComponentContext

Vue 组件通过 `inject(componentContextKey)` 获取的渲染上下文接口：

- `componentModel`、`dataContext`、`surfaceId`
- `resolveValue(raw)` — 解析动态/静态值
- `dispatchAction(name, context?)` — 派发 A2UI action
- `createSetter(path)` — 创建 dataModel 绑定 setter

## 4. 消息处理

`MessageProcessor.processMessages(msgs)` 遍历 A2UIServerMessage[]：

1. 只处理 `version === "v0.9"`
2. `createSurface` → `surfaceGroup.getOrCreate()` + `surface.createSurface()`
3. `updateComponents` → `surface.updateComponents()`
4. `updateDataModel` → `surface.updateDataModel()`
5. `deleteSurface` → `surfaceGroup.delete()`
6. 目标 surface 不存在时忽略并 log warning

## 5. Vue 渲染层

### A2uiSurface

- Props：`surfaceId`（string），`surfaceGroup`（SurfaceGroupModel 实例）
- 通过 `provide("A2UI_SURFACE_GROUP", surfaceGroup)` 传递
- 检查 surface 存在 + root 组件存在 → 渲染 `<A2uiComponent component-id="root" />`
- 否则显示 fallback

### A2uiComponent

- Props：`surfaceId`、`componentId`
- 通过 `inject("A2UI_SURFACE_GROUP")` 获取 SurfaceGroupModel
- 从 `catalogRegistry` 中按 componentType 查找对应 Vue 组件
- 使用 `<component :is="..." />` 动态渲染
- 构建 ComponentContext 并通过 `provide(componentContextKey, ctx)` 传递
- Fallback 处理：组件未找到、组件类型未注册、上下文缺失

## 6. Basic Catalog 组件

17 个组件全部实现，均使用 `<script setup lang="ts">`：

| 分类 | 组件 | 关键属性 | 交互 |
|------|------|---------|------|
| 内容 | Text | text, usageHint | 动态值绑定 |
| | Image | url, alt | |
| | Icon | name | Unicode emoji fallback |
| | Video | url | |
| | AudioPlayer | url | |
| | Divider | — | |
| 布局 | Row | children, distribution, alignment | 递归子渲染 |
| | Column | children, distribution, alignment | 递归子渲染 |
| | List | children, direction | 动态模板渲染 |
| | Card | child | 递归子渲染 |
| | Tabs | tabItems | 标签页切换 |
| | Modal | child | 简单 overlay |
| 交互 | Button | child, action | click → dispatchAction |
| | TextField | label, text, usageHint | input → createSetter → dataModel |
| | CheckBox | label, value | toggle → createSetter |
| | ChoicePicker | label, options, value | select → createSetter |
| | Slider | label, min, max, value | slide → createSetter |
| | DateTimeInput | label, value | change → createSetter |

## 7. 组件注册机制

- `catalog-registry.ts`：全局 `Map<string, Component>` 注册表
- `components/index.ts`：`registerBasicCatalog()` 一次性注册全部 17 个组件
- `core/catalog.ts`：`getCatalogComponent(name)` 从注册表同步获取，首次调用时自动初始化

## 8. 数据绑定

支持两种值传递方式：

- **静态值**：`{ "text": "Hello" }`
- **动态值**：`{ "text": { "path": "/user/name" } }`

ComponentContext.resolveValue() 自动识别并解析。
createSetter() 绑定到 dataModel 路径，输入组件变化时自动写回。

## 9. 扩展新组件

1. 在 `components/basic/` 下创建 Vue SFC
2. 在 `components/index.ts` 中 import 并注册到 `registerBasicCatalog()`
3. 组件通过 `inject(componentContextKey)` 获取 ComponentContext
4. 使用 `resolveValue()` 解析属性，`createSetter()` 实现双向绑定
