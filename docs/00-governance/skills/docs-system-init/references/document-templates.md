# Documentation Templates

## Layer README Template

```md
# <Layer Name>

> 文档角色：<产品 / 设计 / 契约 / 当前实现 / 交付 / 笔记>
> 是否真相源：<是 / 否 / 任务期>
> 更新触发：<什么时候必须同步>

## 定位

## 文件索引

## 维护规则
```

## Target Design Module Template

```md
# <Module> 目标设计

## 1. 模块定位
## 2. 目标能力
## 3. 不负责的事情
## 4. 对外接口
## 5. 内部结构设计
## 6. 核心流程
## 7. 数据与状态模型
## 8. 与其他模块的关系
## 9. 当前状态
## 10. 演进计划
```

## Current Implementation Module Template

```md
# <Module> 当前实现

> 文档角色：当前实现
> 是否真相源：是
> 更新触发：模块源码结构、入口、运行流程、状态模型或测试方式变化

## 1. 当前定位
## 2. 技术栈
## 3. 真实职责边界
## 4. 真实工程结构
## 5. 关键文件职责
## 6. 公共 API / 对外入口
## 7. 核心运行流程
## 8. 数据流与状态流
## 9. 与契约的关系
## 10. 已知差异
## 11. 测试与验收
## 12. 维护规则
```

## Delivery Task Template

```text
50-delivery/planning/YYYY-MM-short-topic/
  context.md
  plan.md
  checklist.md
  progress.md
  decisions.md
  result.md
```
