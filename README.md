# CppUT Assistant VSCode 插件

一个面向 C++ 工程的 VSCode 插件原型：
- 在侧边栏展示工程 C++ 文件与方法目录；
- 勾选目标方法后，调用大模型流式生成 GoogleTest 单测代码；
- 支持手动保存生成结果；
- 支持一键尝试执行覆盖率流程（构建、ctest、gcovr）。

## 功能模块映射

### 1) UI 交互模块
- 侧边栏入口：`CppUT`。
- 支持：
  - 刷新工程方法索引；
  - 选择文件、勾选方法；
  - 流式显示生成结果；
  - 保存测试文件；
  - 触发覆盖率流程。

### 2) 模型训练与调用模块（当前实现为“调用”）
- 通过环境变量配置 API：
  - `CPPUT_API_ENDPOINT`
  - `CPPUT_API_KEY`
- 若未配置，自动使用 mock 流式结果，方便本地调试 UI 与流程。

### 3) 知识图谱模块（占位）
- 目前将选中方法整理为上下文信息拼接进 prompt。
- 后续可接入真实知识图谱检索。

### 4) C++ 代码解析模块
- 递归扫描工作区的 `.cpp/.cc/.cxx/.hpp/.hh/.h`。
- 使用正则提取方法签名，维护 “文件 -> 方法列表” 索引。

### 5) Memory 模块（占位）
- 按会话聚合流式输出，支持读取和清理。

## Prompt 设计
插件内置了你要求的提示词结构，核心内容包括：
- “你是c++测试专家…”
- 明确目标函数名与签名；
- 要求行覆盖率和分支覆盖率；
- 以 GoogleTest 输出完整可编译 cpp 文件；
- 不包含 `main` 函数。

## 项目结构

```txt
src/
  extension.ts
  sidebarProvider.ts
  types.ts
  modules/
    cppParser.ts
    modelClient.ts
    testGenerator.ts
    coverageRunner.ts
    knowledgeGraph.ts
    memory.ts
media/
  beaker.svg
```

## 运行环境与依赖

### 必需环境
- Node.js >= 18（建议 20）
- npm >= 9
- VSCode >= 1.85

### 插件开发依赖
执行：

```bash
npm install
```

主要依赖：
- `typescript`
- `@types/vscode`
- `@types/node`
- `eslint`
- `@typescript-eslint/*`

### C++ 测试与覆盖率工具（用于插件触发后的本地工程）
根据你的 C++ 项目准备：
- 编译链：`cmake` + `make/ninja`
- 测试框架：`googletest`
- 测试执行：`ctest`
- 覆盖率工具：`gcovr`（可选但推荐）

## 如何运行插件

1. 安装依赖
```bash
npm install
```

2. 编译
```bash
npm run compile
```

3. 在 VSCode 中启动调试
- 打开本仓库；
- 按 `F5`（Run Extension）；
- 在新弹出的 Extension Development Host 中，左侧 Activity Bar 选择 `CppUT`。

4. 使用流程
- 打开一个 C++ 工程目录；
- 点击“刷新工程方法索引”；
- 选择文件并勾选方法；
- 点击“流式生成测试”；
- 点击“保存测试文件”导出生成结果；
- 点击“运行覆盖率流程”在终端中尝试构建/测试/报告。

## 大模型 API 配置（可选）

在启动 VSCode 前设置环境变量：

```bash
export CPPUT_API_ENDPOINT="https://your-llm-endpoint/v1/chat/completions"
export CPPUT_API_KEY="your_api_key"
```

> 未设置时插件会返回 mock 内容，以便无 API 场景下仍可体验完整链路。

## 已知限制
- C++ 方法解析当前基于正则，复杂模板/宏场景可能识别不完整。
- 覆盖率命令使用通用脚本，不同工程可能需自定义 CMake 与 gcov 参数。
- 知识图谱、模型训练、长期记忆目前为占位实现。

## 后续建议
- 引入 clangd/libclang 做 AST 级方法提取与调用关系分析；
- 增加测试文件模板策略（按命名规则、fixture 自动生成）；
- 覆盖率结果在插件内可视化（HTML 解析/树形显示）；
- 接入向量数据库增强知识图谱与 Memory 检索能力。
