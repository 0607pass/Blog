+++
date = '2026-01-08T22:00:43+08:00'
draft = true
title = 'SpecCoding'
+++

## 官方地址

https://github.com/github/spec-kit

下载见 官方地址

开始使用 斜杠命令（slash commands） 与你的 AI Agent 交互：

## 核心命令

### 2.1 /speckit.constitution
👉 建立项目的基本原则 / 约束（项目宪章）

### 2.2 /speckit.specify
👉 创建基础规格说明（需求/规格定义）

### 2.3 /speckit.plan
👉 生成实现计划（设计与实施方案）

### 2.4 /speckit.tasks
👉 生成可执行的任务列表（拆解为具体任务）

### 2.5 /speckit.implement
👉 执行实现（开始写代码 / 实现功能）

## 🧩 增强命令（Enhancement Commands）

可选命令，用于提升规格说明的质量和可靠性

### /speckit.clarify（可选）
👉 在规划之前，对存在歧义或不确定的地方提出结构化问题，降低风险

📌 建议在 /speckit.plan 之前 使用

### /speckit.analyze（可选）
👉 对不同产物（规格、计划、任务等）进行一致性与对齐分析

📌 建议在 /speckit.tasks 之后、/speckit.implement 之前 使用

### /speckit.checklist（可选）
👉 生成质量检查清单，用于验证：

- 需求是否完整
- 描述是否清晰
- 各部分是否前后一致

📌 建议在 /speckit.plan 之后 使用
