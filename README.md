# CppUT Assistant VSCode 插件（前端 TS/JS + 后端 Python）

本仓库实现了一个 **VSCode 插件**：针对当前打开的 C++ 工程，选择目标函数后生成 GoogleTest 单元测试，并尝试运行覆盖率流程。

> 本次重构已将后端核心模块从 TS/JS 迁移到 Python：
> - 模型训练与调用模块（当前为模型调用）
> - 知识图谱模块（占位）
> - C++ 代码解析模块
> - Memory 模块（占位）
>
> UI 交互模块与宿主启动逻辑继续保留在 TS/JS。

---

## 1. 功能概览

### 1.1 UI 交互模块（TS/JS，保留）
- VSCode 左侧边栏显示 `CppUT Assistant`。
- 支持刷新工程索引、选择文件、勾选方法、流式显示生成内容、保存测试文件、触发覆盖率命令。

### 1.2 模型训练与调用模块（Python）
- 当前不做训练，仅做调用。
- 通过环境变量读取：
  - `CPPUT_API_ENDPOINT`
  - `CPPUT_API_KEY`
- 未配置时自动回退为 mock 流式输出，方便离线联调。

### 1.3 知识图谱模块（Python，占位）
- 将所选方法信息转为上下文文本，拼接到 prompt 中。

### 1.4 C++ 代码解析模块（Python）
- 扫描工程目录树的 C/C++ 文件。
- 提取方法签名并建立 `文件 -> 方法列表` 索引。

### 1.5 Memory 模块（Python，占位）
- 保存一次生成会话中的流式文本块，最终合并输出。

---

## 2. 总体架构

- `src/`：VSCode 扩展前端与宿主逻辑（TypeScript）。
- `python_backend/`：后端业务模块（Python）。
- TS 通过 `child_process.spawn` 调用 Python 后端命令：
  - `python -m python_backend.service index --root <workspace>`
  - `python -m python_backend.service generate --file <file> --methods <json_array>`

---

## 3. Prompt 设计（已内置）

后端生成时使用你要求的提示词结构：

- “你是c++测试专家，你的任务是根据提供的目标测试源函数信息，使用googletest作为基础测试框架编写测试用例。”
- 包含目标函数名与签名。
- 明确要求行覆盖率、分支覆盖率。
- 输出完整、可编译的 `.cpp` 测试文件。
- 不保留 `main` 函数。

---

## 4. Windows 环境安装（详细步骤）

## 4.1 必备软件

1. **Node.js 18+（建议 20 LTS）**
2. **Python 3.10+（建议 3.11）**
3. **Git**
4. **VSCode 1.85+**
5. （覆盖率可选）CMake / Ninja / MinGW 或 MSVC / gcovr

可用以下命令检查：

```powershell
node -v
npm -v
python --version
git --version
```

## 4.2 克隆与安装前端依赖

```powershell
git clone <你的仓库地址>
cd aicpput
npm install
```

## 4.3 创建 Python 虚拟环境（强烈建议）

```powershell
python -m venv .venv
.\.venv\Scripts\activate
python -m pip install --upgrade pip
```

> 当前 Python 后端仅使用标准库，不强制第三方 pip 包。
>
> 若你希望生成 HTML 覆盖率报告，建议额外安装：

```powershell
pip install gcovr
```

## 4.4 模型 API 环境变量（可选）

不设置时会使用 mock 输出；设置后可调用真实模型。

```powershell
$env:CPPUT_API_ENDPOINT="https://your-llm-endpoint/v1/chat/completions"
$env:CPPUT_API_KEY="your_api_key"
```

如果 Python 可执行文件名不是 `python`，可指定：

```powershell
$env:CPPUT_PYTHON_BIN="py"
```

---

## 5. 如何运行插件

## 5.1 编译扩展

```powershell
npm run compile
```

## 5.2 启动调试宿主

1. 在 VSCode 中打开本仓库。
2. 按 `F5`（Run Extension）。
3. 在新弹出的 Extension Development Host 中，点击左侧 `CppUT` 图标。

## 5.3 在 C++ 工程中使用

1. 打开目标 C++ 工程目录。
2. 点击 **刷新工程方法索引**。
3. 选择目标文件并勾选方法。
4. 点击 **流式生成测试**。
5. 点击 **保存测试文件** 导出 `.cpp`。
6. 点击 **运行覆盖率流程**（按你本地工具链情况尝试执行）。

---

## 6. Python 后端模块说明

`python_backend/` 目录：

- `cpp_parser.py`：目录扫描与方法提取。
- `model_client.py`：模型调用与 mock 回退。
- `knowledge_graph.py`：上下文增强（占位）。
- `memory_store.py`：流式记忆聚合（占位）。
- `test_generator.py`：Prompt 生成。
- `service.py`：命令入口（供 TS 调用）。
- `types.py`：数据结构。

---

## 7. 命令行直接验证后端（可选）

在仓库根目录执行：

### 7.1 索引工程方法

```powershell
python -m python_backend.service index --root .
```

### 7.2 生成测试（示例）

```powershell
python -m python_backend.service generate --file "你的cpp文件路径" --methods "[\"methodA\",\"methodB\"]"
```

后端会输出 JSON 行（chunk/done），供 VSCode 前端流式读取。

---

## 8. 覆盖率说明

插件中“运行覆盖率流程”当前执行通用命令链：

- 若有 `CMakeLists.txt`：尝试 `cmake -S . -B build && cmake --build build`
- 进入 `build` 后尝试 `ctest --output-on-failure`
- 若检测到 `gcovr`：生成 `coverage.html`

> 不同项目构建参数差异很大，实际项目中建议按工程情况调整。

---

## 9. 已知限制

- C++ 方法提取基于正则，复杂模板/宏/多行声明可能不完整。
- 真实模型接口兼容性取决于你的 API 返回格式。
- 知识图谱与 Memory 当前为占位实现，便于后续扩展。

---

## 10. 二次开发建议

- 用 clangd/libclang 替换正则解析，提高方法识别准确率。
- 在 UI 中增加“按类/命名空间”过滤。
- 增加覆盖率结果可视化（树形+高亮）。
- 将 Memory 与 KG 接入向量数据库实现检索增强。
